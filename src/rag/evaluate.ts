import * as fs from 'fs';
import * as path from 'path';
import { loadStore, searchBaseline, searchTfidf } from './store';
import { ingestDocuments } from './ingest';

export interface EvalQuery {
  rule: string;
  query: string;
  acceptable: string[];
  split: 'tune' | 'test';
}

export interface SplitMetrics { n: number; hit1: number; hit3: number; mrr: number }
export type Ranker = (query: string) => string[]; // ordered chunk ids, best first

const critId = (chunkId: string) => chunkId.split('-')[0];

export function evaluate(rank: Ranker, queries: EvalQuery[]): Record<'tune' | 'test' | 'all', SplitMetrics> {
  const acc = { tune: [0, 0, 0, 0], test: [0, 0, 0, 0], all: [0, 0, 0, 0] } as Record<string, number[]>;
  for (const q of queries) {
    const ids = rank(q.query).map(critId);
    const pos = ids.findIndex(id => q.acceptable.includes(id));
    for (const key of [q.split, 'all']) {
      acc[key][0] += 1;
      if (pos === 0) acc[key][1] += 1;
      if (pos >= 0 && pos < 3) acc[key][2] += 1;
      if (pos >= 0) acc[key][3] += 1 / (pos + 1);
    }
  }
  const m = (a: number[]): SplitMetrics => ({ n: a[0], hit1: a[0] ? a[1] / a[0] : 0, hit3: a[0] ? a[2] / a[0] : 0, mrr: a[0] ? a[3] / a[0] : 0 });
  return { tune: m(acc.tune), test: m(acc.test), all: m(acc.all) };
}

export function loadQueries(): EvalQuery[] {
  const file = path.join(__dirname, '..', '..', 'data', 'retrieval-eval.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).queries as EvalQuery[];
}

/** Always returns the most common acceptable criterion first: shows what class imbalance alone would score. */
export function majorityRanker(queries: EvalQuery[]): Ranker {
  const counts = new Map<string, number>();
  for (const q of queries) for (const a of q.acceptable) counts.set(a, (counts.get(a) || 0) + 1);
  const order = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
  return () => order;
}

const pct = (x: number) => (100 * x).toFixed(1).padStart(5) + '%';

export function main(): void {
  if (loadStore().length === 0) ingestDocuments();
  const queries = loadQueries();
  const rankers: Array<[string, Ranker]> = [
    ['majority-class (always 4.1.2 first)', majorityRanker(queries)],
    ['baseline: term-count cosine', q => searchBaseline(q, 100).map(r => r.id)],
    ['new: TF-IDF (IDF + stopwords + title x2)', q => searchTfidf(q, 100).map(r => r.id)]
  ];
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { search } = require('./store');
    if (typeof search === 'function' && process.env.EVAL_INCLUDE_DEFAULT !== '0') rankers.push(['default search()', (q: string) => search(q, 100).map((r: { id: string }) => r.id)]);
  } catch { /* ignore */ }

  if (process.env.EVAL_DETAIL === '1') {
    const tf = (q: string) => searchTfidf(q, 100).map(r => r.id.split('-')[0]);
    for (const q of queries.filter(x => x.split === 'test')) {
      const ids = tf(q.query);
      if (!q.acceptable.includes(ids[0])) console.log(`MISS ${q.rule}: expected ${q.acceptable.join('/')}, got ${ids.slice(0, 3).join(', ')}`);
    }
    return;
  }
  console.log(`Retrieval evaluation: ${queries.length} queries (tune ${queries.filter(q => q.split === 'tune').length}, test ${queries.filter(q => q.split === 'test').length})\n`);
  console.log('| Ranking | split | n | hit@1 | hit@3 | MRR |\n|---|---|---|---|---|---|');
  for (const [name, rank] of rankers) {
    const r = evaluate(rank, queries);
    for (const split of ['tune', 'test', 'all'] as const) {
      console.log(`| ${name} | ${split} | ${r[split].n} | ${pct(r[split].hit1)} | ${pct(r[split].hit3)} | ${r[split].mrr.toFixed(3)} |`);
    }
  }
}

if (require.main === module) main();
