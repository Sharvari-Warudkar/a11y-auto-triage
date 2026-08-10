import * as fs from 'fs';
import * as path from 'path';
import { getEmbedding } from './embeddings';
import { saveStore } from './store';
import { WcagChunk } from '../types';

const WCAG_DIR = path.join(__dirname, '..', '..', 'data', 'wcag');

interface WcagDocument {
  id: string;
  title: string;
  content: string;
  metadata: {
    source: string;
    criterionId: string;
    type: string;
  };
}

function loadWcagDocuments(): WcagDocument[] {
  const files = fs.readdirSync(WCAG_DIR).filter(f => f.endsWith('.md'));
  const documents: WcagDocument[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(WCAG_DIR, file), 'utf-8');
    const criterionId = file.replace('.md', '');
    const titleMatch = content.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : criterionId;

    documents.push({
      id: criterionId,
      title,
      content,
      metadata: {
        source: file,
        criterionId,
        type: 'wcag-criterion'
      }
    });
  }

  return documents;
}

export async function ingestDocuments(): Promise<WcagChunk[]> {
  console.log('Loading WCAG documents...');
  const documents = loadWcagDocuments();
  console.log(`Found ${documents.length} documents`);

  const chunks: WcagChunk[] = [];
  for (const doc of documents) {
    console.log(`Embedding: ${doc.id}`);
    const embedding = await getEmbedding(doc.content);
    chunks.push({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      embedding,
      metadata: doc.metadata
    });
  }

  saveStore(chunks);
  console.log(`Ingested ${chunks.length} chunks into vector store`);
  return chunks;
}

if (require.main === module) {
  require('dotenv').config();
  ingestDocuments().catch(err => {
    console.error('Ingestion failed:', err.message);
    process.exit(1);
  });
}
