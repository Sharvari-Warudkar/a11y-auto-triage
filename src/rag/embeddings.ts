// Keyword-based matching for small corpus (9 WCAG docs)
// No external API needed - uses TF-IDF style word matching

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
