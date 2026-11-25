// Usage: node scripts/measure.js <dir-with-bugs-json> [--table] [--legacy-corpus]
// Recomputes the accuracy metrics from raw pipeline output. No LLM calls.
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter(f => /^bugs-.*\.json$/.test(f)).sort();
const corpus = new Set(fs.readdirSync(path.join(__dirname, '..', 'data', 'wcag')).map(f => f.split('-')[0]));
// Runs made before data/wcag/3.1.1-language-of-page.md existed were scored against the 9-document corpus.
if (process.argv.includes('--legacy-corpus')) corpus.delete('3.1.1');
const EXPECTED = { 'color-contrast': '1.4.3', 'image-alt': '1.1.1', label: '3.3.2', 'select-name': '4.1.2', 'html-has-lang': '3.1.1' };
const CONCRETE = /(\balt\b|aria-[a-z]+|\blang\b|'for'|\"for\"|\bfor\b\s*(attribute|=|\/)|label'? element|<label|<html|<img|<select|#[0-9a-f]{6}|\brole=)/i;

const rows = [];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const page = path.basename(d.url.split(String.fromCharCode(92)).join('/'));
  for (const b of d.bugLogs) {
    const rule = b._metadata.violationId, cited = b.wcag_criterion, s = b.steps_to_reproduce;
    let steps;
    if (typeof s === 'string') steps = 'string';
    else if (s.every(x => typeof x === 'number')) steps = 'numeric-only';
    else if (s.some(x => typeof x === 'number')) steps = 'mixed';
    else steps = 'clean';
    const fix = String(b.suggested_fix || '');
    const sel = (b.element_selector || '').split(' > ').pop();
    rows.push({
      page, rule, cited, severity: b.severity, parseError: !!b._parse_error,
      correct: cited === EXPECTED[rule] && corpus.has(cited),
      inCorpus: corpus.has(cited), steps,
      readable: steps !== 'numeric-only',
      actionable: !/^See https?:/i.test(fix) && !b._parse_error && CONCRETE.test(fix),
      fixCitesSelector: sel && sel !== 'unknown' && fix.includes(sel.replace(/^[.#]/, '')),
      top1: b._metadata.retrievedCriteria[0].split('-')[0] === EXPECTED[rule],
      top3: b._metadata.retrievedCriteria.some(c => c.split('-')[0] === EXPECTED[rule]),
      model: b._metadata.model || 'llama-3.3-70b-versatile (pre-dates metadata)',
      claudeMd: b._metadata.claudeMd === undefined ? 'n/a' : b._metadata.claudeMd
    });
  }
}
const n = rows.length, c = k => rows.filter(r => (typeof k === 'function' ? k(r) : r[k])).length;
const pct = x => `${x}/${n} (${Math.round(100 * x / n)}%)`;
const out = {
  model: [...new Set(rows.map(r => r.model))].join(', '), claudeMd: [...new Set(rows.map(r => r.claudeMd))].join(', '), n,
  parseSuccess: pct(n - c('parseError')), correctCitation: pct(c('correct')), citationInCorpus: pct(c('inCorpus')),
  retrievalTop1: pct(c('top1')), retrievalTop3: pct(c('top3')),
  readableSteps: pct(c('readable')), cleanSteps: pct(c(r => r.steps === 'clean')), numericOnlySteps: c(r => r.steps === 'numeric-only'),
  actionableFix: pct(c('actionable')), fixCitesSelector: pct(c('fixCitesSelector')),
  severity: rows.reduce((a, r) => (a[r.severity] = (a[r.severity] || 0) + 1, a), {}),
  checkoutSeverity: rows.filter(r => r.page.startsWith('checkout')).map(r => `${r.rule}:${r.severity}`)
};
if (process.argv.includes('--table')) {
  console.log('| Page | axe rule | Cited SC | Correct | Steps | Actionable fix | Severity | Parse error |\n|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.page} | ${r.rule} | ${r.cited} | ${r.correct ? 'yes' : 'no'} | ${r.steps} | ${r.actionable ? 'yes' : 'no'} | ${r.severity} | ${r.parseError ? 'yes' : ''} |`);
}
console.log(JSON.stringify(out, null, 2));
