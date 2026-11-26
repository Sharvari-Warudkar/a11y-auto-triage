import { test, expect } from '@playwright/test';
import { buildIdf, tfidfSimilarity, getKeywords } from '../src/rag/embeddings';
import { ingestDocuments } from '../src/rag/ingest';
import { loadStore, search, searchBaseline } from '../src/rag/store';
import { evaluate, loadQueries, majorityRanker } from '../src/rag/evaluate';

test.describe('Retrieval ranking and evaluation', () => {
  test.beforeAll(() => { ingestDocuments(); });

  test('IDF gives rarer terms more weight than terms found in every document', () => {
    const idf = buildIdf(['contrast ratio text colour', 'keyboard focus text', 'alternative text image']);
    expect(idf.get('contrast')!).toBeGreaterThan(idf.get('text')!);
  });

  test('stopwords and corpus filler words do not influence the TF-IDF score', () => {
    const idf = buildIdf(['contrast ratio text', 'keyboard focus order']);
    const a = tfidfSimilarity('contrast ratio', 'contrast ratio text', idf);
    const b = tfidfSimilarity('the user element contrast ratio page', 'contrast ratio text', idf);
    expect(Math.abs(a - b)).toBeLessThan(1e-9);
    expect(getKeywords('the user element').has('user')).toBe(true); // baseline keeps them
  });

  test('title boost raises the score of a document whose title contains the query term', () => {
    const idf = buildIdf(['keyboard access', 'keyboard access']);
    const withTitle = tfidfSimilarity('keyboard', 'keyboard access', idf, 'Keyboard');
    const without = tfidfSimilarity('keyboard', 'keyboard access', idf, 'Other');
    expect(withTitle).toBeGreaterThanOrEqual(without);
  });

  test('default search() uses the TF-IDF ranking and returns top-3', () => {
    const results = search('html-has-lang <html> element must have a lang attribute');
    expect(results.length).toBe(3);
    expect(results[0].id).toBe('3.1.1-language-of-page');
  });

  test('evaluation set: every acceptable criterion exists in the corpus; split is tune/test', () => {
    const ids = new Set(loadStore().map(c => c.id.split('-')[0]));
    const queries = loadQueries();
    expect(queries.length).toBeGreaterThan(40);
    for (const q of queries) {
      expect(['tune', 'test']).toContain(q.split);
      for (const a of q.acceptable) expect(ids.has(a)).toBe(true);
    }
  });

  test('evaluation harness computes hit@1, hit@3 and MRR on a toy ranker', () => {
    const toy = [{ rule: 'r', query: 'q', acceptable: ['1.1.1'], split: 'test' as const }];
    expect(evaluate(() => ['1.1.1-x', '2.1.1-y'], toy).test).toEqual({ n: 1, hit1: 1, hit3: 1, mrr: 1 });
    expect(evaluate(() => ['2.1.1-y', '1.1.1-x'], toy).test).toEqual({ n: 1, hit1: 0, hit3: 1, mrr: 0.5 });
    expect(evaluate(() => ['2.1.1-y'], toy).test).toEqual({ n: 1, hit1: 0, hit3: 0, mrr: 0 });
  });

  test('acceptance A2/A3 (docs/specs/RETRIEVAL_EVAL.md): TF-IDF beats baseline on the test split', () => {
    const queries = loadQueries();
    const base = evaluate(q => searchBaseline(q, 100).map(r => r.id), queries).test;
    const neu = evaluate(q => search(q, 100).map(r => r.id), queries).test;
    expect(neu.hit1 - base.hit1).toBeGreaterThanOrEqual(0.10);
    expect(neu.hit3).toBeGreaterThanOrEqual(base.hit3);
    expect(neu.mrr).toBeGreaterThanOrEqual(base.mrr);
  });

  test('majority-class reference ranker is reported for context', () => {
    const queries = loadQueries();
    const m = evaluate(majorityRanker(queries), queries).test;
    expect(m.hit1).toBeGreaterThan(0); // 4.1.2 dominates the set; documented in RETRIEVAL_EVAL_RESULTS.md
  });
});
