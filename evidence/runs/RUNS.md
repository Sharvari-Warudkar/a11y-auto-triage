# Runs and metrics (all recomputed with `node scripts/measure.js <dir>`)

| Metric | A: Llama 3.3 70B, original code (2026-08-14, `evidence/data`) | B: gpt-oss-120b, original code (2026-11-25, `evidence/rerun`) | C: gpt-oss-120b, improved code, CLAUDE.md on (`with-claude-md`) | D: same, CLAUDE.md off (`without-claude-md`) | Target |
|---|---|---|---|---|---|
| LLM parse success | 10/11 | 9/11 | 11/11 | 11/11 | n/a |
| Correct citation (ID in corpus) | 9/11 (82%) | 8/11 (73%) | 11/11 (100%) | 11/11 (100%) | 85% |
| Readable steps_to_reproduce | 6/11 | 11/11 | 11/11 | 11/11 | n/a |
| Actionable fix | 6/11 (55%) | 9/11 (82%) | 11/11 (100%) | 11/11 (100%) | 75% |
| Retrieval: expected criterion top-1 | 6/11 | 6/11 | 7/11 | 7/11 | n/a |

A and B were scored against the 9-document corpus they ran on (`--legacy-corpus`); C and D use the 10-document corpus.

## What changed between B and C (code fixes, not only the model)
- `data/wcag/3.1.1-language-of-page.md` added (the html-has-lang miss).
- `max_tokens` default 1000 to 4000, one retry with double the budget on a parse failure, tolerant JSON extraction (parse errors).
- Output schema now asks for a JSON array of plain strings; `normalizeSteps()` drops bare numbers (numeric steps).
- Contrast fix computed in code from axe-core's measured colours (generic contrast fix).
- Fallback bug log now carries axe's failure summary and selector instead of a link only.
- CLAUDE.md rules loaded into the prompt (see docs/CONTEXT_ENGINEERING.md).

## Caveats
- The fixes were designed after seeing failures on these same 4 fixtures and re-measured on them: there is no held-out set, so the 100% figures are optimistic.
- C and D differ from A in both code and model, so A to C is not a like-for-like comparison.
- n = 11, one run each. Not fixed: Failure 4 (axe-core accepts placeholder-only inputs, so 8 checkout inputs are still not reported), and retrieval ranks 1.4.11 above 1.4.3 for contrast.
