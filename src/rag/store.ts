import * as fs from 'fs';
import * as path from 'path';
import { WcagChunk } from '../types';

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'vector-store.json');

export function loadStore(): WcagChunk[] {
  if (!fs.existsSync(STORE_PATH)) return [];
  return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
}

export function saveStore(chunks: WcagChunk[]): void {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(chunks, null, 2));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export interface SearchResult extends Omit<WcagChunk, 'embedding'> {
  score: number;
}

export function search(queryEmbedding: number[], topK: number = 3): SearchResult[] {
  const store = loadStore();
  if (store.length === 0) {
    throw new Error('Vector store is empty. Run ingestion first: npm run ingest');
  }

  const scored = store.map(chunk => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(({ embedding, ...rest }) => rest);
}
