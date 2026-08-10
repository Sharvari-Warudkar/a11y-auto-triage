const fs = require('fs');
const path = require('path');
const { getEmbedding } = require('./embeddings');
const { saveStore } = require('./store');

const WCAG_DIR = path.join(__dirname, '..', '..', 'data', 'wcag');

function loadWcagDocuments() {
  const files = fs.readdirSync(WCAG_DIR).filter(f => f.endsWith('.md'));
  const documents = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(WCAG_DIR, file), 'utf-8');
    const criterionId = file.replace('.md', '');

    const sections = content.split(/^## /m).filter(Boolean);
    const title = sections[0].replace(/^# /, '').trim();

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

async function ingestDocuments() {
  console.log('Loading WCAG documents...');
  const documents = loadWcagDocuments();
  console.log(`Found ${documents.length} documents`);

  const chunks = [];
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
  ingestDocuments().catch(err => {
    console.error('Ingestion failed:', err.message);
    process.exit(1);
  });
}

module.exports = { ingestDocuments, loadWcagDocuments };
