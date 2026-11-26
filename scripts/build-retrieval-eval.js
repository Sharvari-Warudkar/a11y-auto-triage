// Builds data/retrieval-eval.json: one query per axe-core rule (plus the project's custom rule).
// Query text = exactly what the pipeline sends: "<id> <help> <description>".
// Acceptable criteria = axe-core's own wcag tags that exist in data/wcag/, plus the project mapping below.
// Split (fixed in docs/specs/RETRIEVAL_EVAL.md): tune = rules seen in the original four fixtures, test = all others.
const fs = require('fs');
const path = require('path');
const axe = require('axe-core');

const corpus = new Set(fs.readdirSync(path.join(__dirname, '..', 'data', 'wcag')).map(f => f.split('-')[0]));
const SCAN_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa'];
const TUNE_RULES = new Set(['color-contrast', 'image-alt', 'label', 'select-name', 'html-has-lang']);
// Project mapping used by scripts/measure.js (accepted in addition to axe's tags).
const EXTRA = { label: ['3.3.2'] };

function tagToSc(tag) {
  const m = /^wcag(\d)(\d)(\d+)$/.exec(tag);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

const queries = [];
const outOfCoverage = [];
for (const r of axe.getRules()) {
  if (!r.tags.some(t => SCAN_TAGS.includes(t))) continue;
  const fromTags = r.tags.map(tagToSc).filter(Boolean);
  const acceptable = [...new Set([...fromTags, ...(EXTRA[r.ruleId] || [])])].filter(sc => corpus.has(sc));
  if (acceptable.length === 0) { outOfCoverage.push({ rule: r.ruleId, axeScs: fromTags }); continue; }
  queries.push({
    rule: r.ruleId,
    query: `${r.ruleId} ${r.help} ${r.description}`,
    acceptable,
    split: TUNE_RULES.has(r.ruleId) ? 'tune' : 'test'
  });
}
// Custom rule (src/scan.ts findPlaceholderOnlyInputs)
queries.push({
  rule: 'placeholder-only-label',
  query: 'placeholder-only-label Form inputs must have a persistent visible label, not only a placeholder Ensures form inputs have a persistent visible label and do not rely only on placeholder text (WCAG 3.3.2)',
  acceptable: ['3.3.2'],
  split: 'test'
});

const out = { generated: 'scripts/build-retrieval-eval.js', axeVersion: axe.version, corpus: [...corpus].sort(), queries, outOfCoverage };
fs.writeFileSync(path.join(__dirname, '..', 'data', 'retrieval-eval.json'), JSON.stringify(out, null, 2) + '\n');
const n = s => queries.filter(q => q.split === s).length;
console.log(`queries: ${queries.length} (tune ${n('tune')}, test ${n('test')}); out of coverage: ${outOfCoverage.length}`);
