import * as fs from 'fs';
import * as path from 'path';
import { saveStore, StoredChunk } from './store';

const WCAG_DIR = path.join(__dirname, '..', '..', 'data', 'wcag');

function loadWcagDocuments(): StoredChunk[] {
  const files = fs.readdirSync(WCAG_DIR).filter(f => f.endsWith('.md'));
  const documents: StoredChunk[] = [];

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

export function ingestDocuments(): StoredChunk[] {
  console.log('Loading WCAG documents...');
  const documents = loadWcagDocuments();
  console.log(`Found ${documents.length} documents`);

  saveStore(documents);
  console.log(`Ingested ${documents.length} chunks into store`);
  return documents;
}

if (require.main === module) {
  ingestDocuments();
}
