// Keyword matching for a small corpus (10 WCAG docs), no external API.
// similarity()/getKeywords(): baseline term-count cosine (kept for comparison).
// buildIdf()/tfidfSimilarity(): the TF-IDF ranking used by default (see bottom of file).

export function getKeywords(text: string): Map<string, number> {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }
  return freq;
}

export function similarity(textA: string, textB: string): number {
  const kwA = getKeywords(textA);
  const kwB = getKeywords(textB);

  let dot = 0, magA = 0, magB = 0;
  for (const [word, count] of kwA) {
    const countB = kwB.get(word) || 0;
    dot += count * countB;
    magA += count * count;
  }
  for (const [, count] of kwB) {
    magB += count * count;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ---------- TF-IDF ranking (docs/specs/RETRIEVAL_EVAL.md, T9.3) ----------
// Parameters are fixed by the spec and were not tuned on the evaluation results.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'her', 'was', 'one', 'our', 'out',
  'with', 'that', 'this', 'from', 'have', 'has', 'had', 'will', 'been', 'were', 'they', 'their', 'than',
  'then', 'them', 'these', 'those', 'which', 'when', 'where', 'what', 'who', 'whom', 'its', 'also', 'such',
  'only', 'other', 'into', 'over', 'use', 'used', 'uses', 'using', 'each', 'must', 'should', 'may', 'does',
  // corpus-wide filler words named in the spec
  'user', 'users', 'element', 'elements', 'content', 'page'
]);

const TITLE_BOOST = 2;

function tokens(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

/** IDF = ln(1 + N / df), df counted over the given documents (after stopword removal). */
export function buildIdf(docs: string[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const d of docs) for (const t of new Set(tokens(d))) df.set(t, (df.get(t) || 0) + 1);
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(1 + docs.length / n));
  return idf;
}

export function tfidfVector(text: string, idf: Map<string, number>, title = ''): Map<string, number> {
  const titleTerms = new Set(tokens(title));
  const vec = new Map<string, number>();
  for (const t of tokens(text)) vec.set(t, (vec.get(t) || 0) + 1);
  for (const [t, tf] of vec) vec.set(t, tf * (titleTerms.has(t) ? TITLE_BOOST : 1) * (idf.get(t) ?? Math.log(1 + 1)));
  return vec;
}

export function tfidfSimilarity(query: string, doc: string, idf: Map<string, number>, title = ''): number {
  const q = tfidfVector(query, idf);
  const d = tfidfVector(doc, idf, title);
  let dot = 0, magQ = 0, magD = 0;
  for (const [t, w] of q) dot += w * (d.get(t) || 0);
  for (const [, w] of q) magQ += w * w;
  for (const [, w] of d) magD += w * w;
  return magQ === 0 || magD === 0 ? 0 : dot / (Math.sqrt(magQ) * Math.sqrt(magD));
}
