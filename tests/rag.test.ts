import { test, expect } from '@playwright/test';
import { ingestDocuments } from '../src/rag/ingest';
import { search, loadStore } from '../src/rag/store';
import { similarity, getKeywords } from '../src/rag/embeddings';

test.describe('RAG Pipeline', () => {
  test.beforeAll(() => {
    ingestDocuments();
  });

  test('ingests 10 WCAG documents', () => {
    const store = loadStore();
    expect(store.length).toBe(10);
  });

  test('each document has required fields', () => {
    const store = loadStore();
    for (const chunk of store) {
      expect(chunk.id).toBeDefined();
      expect(chunk.title).toBeDefined();
      expect(chunk.content.length).toBeGreaterThan(100);
      expect(chunk.metadata.source).toMatch(/\.md$/);
    }
  });

  test('search returns top-3 results for contrast query', () => {
    const results = search('color contrast ratio text background');
    expect(results.length).toBe(3);
    expect(results[0].id).toContain('1.4');
  });

  test('search returns relevant results for image-alt query', () => {
    const results = search('image alt text non-text content alternative');
    expect(results[0].id).toBe('1.1.1-non-text-content');
  });

  test('search returns relevant results for label query', () => {
    const results = search('label form input instructions');
    const hasLabelDoc = results.some(r => r.id === '3.3.2-labels-or-instructions');
    expect(hasLabelDoc).toBe(true);
  });

  test('similarity function returns 1 for identical texts', () => {
    const score = similarity('hello world test', 'hello world test');
    expect(score).toBeCloseTo(1.0, 5);
  });

  test('similarity function returns 0 for completely different texts', () => {
    const score = similarity('apple banana cherry', 'xyz quantum physics');
    expect(score).toBe(0);
  });

  test('getKeywords extracts word frequencies', () => {
    const kw = getKeywords('the cat sat on the mat the cat');
    expect(kw.get('cat')).toBe(2);
    expect(kw.get('the')).toBe(3);
    expect(kw.get('mat')).toBe(1);
  });
});
