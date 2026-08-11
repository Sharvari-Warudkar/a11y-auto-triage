import * as fs from 'fs';
import * as path from 'path';
import { similarity } from './embeddings';

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'vector-store.json');

export interface StoredChunk {
  id: string;
  title: string;
  content: string;
  metadata: {
    source: string;
    criterionId: string;
    type: string;
  };
}

export interface SearchResult extends StoredChunk {
  score: number;
}

export function loadStore(): StoredChunk[] {
  if (!fs.existsSync(STORE_PATH)) return [];
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
}

export function saveStore(chunks: StoredChunk[]): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(chunks, null, 2));
}

export function search(query: string, topK: number = 3): SearchResult[] {
  const store = loadStore();
  if (store.length === 0) {
    throw new Error('Vector store is empty. Run ingestion first: npm run ingest');
  }

  const scored: SearchResult[] = store.map(chunk => ({
    ...chunk,
    score: similarity(query, chunk.content)
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
