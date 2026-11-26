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

## Update 2026-11-26: custom placeholder check, checkout rule in code, held-out fixtures

New code (no tuning after seeing the held-out results): `findPlaceholderOnlyInputs()` in `src/scan.ts` (custom rule `placeholder-only-label`, SC 3.3.2) and `applyProjectSeverityRules()` in `src/generate.ts`.

### E: original 4 fixtures, new code, gpt-oss-120b (`with-claude-md-v2`)
12 violations (11 axe-core + 1 custom: the 8 placeholder-only checkout inputs). Parse 12/12, correct citation 12/12, actionable fix 12/12, checkout bugs critical 3/3.

### Held-out fixtures: `fixtures/holdout/` (4 pages, 16 violations)
Written and ground truth fixed (`scripts/measure.js`, commit 173737e) before the first held-out run. Not used to design any fix. Run once per model, no code changes between models.

| Metric | gpt-oss-120b | gpt-oss-20b | qwen3.8-27b |
|---|---|---|---|
| Parse success | 16/16 | 16/16 | 16/16 |
| Correct citation | 16/16 (100%) | 16/16 (100%) | 15/16 (94%) |
| Actionable fix | 16/16 | 16/16 | 16/16 |
| Readable steps | 16/16 | 16/16 | 16/16 |
| Expected SC retrieval top-1 / top-3 | 9/16 / 16/16 | 9/16 / 16/16 | 9/16 / 16/16 |
| Checkout page bugs critical | 4/4 | 4/4 | 4/4 |

The one qwen miss: `input-image-alt` on checkout-payment cited 4.1.2 instead of 1.1.1.

### Limits of the held-out result
- Same author wrote fixtures and pipeline; the held-out pages use violation types the corpus covers (no document-title or heading rules), so this tests generalisation to new pages, not to new criteria.
- n = 16, one run per model, so a single item is 6 points.
- axe-core violation counts per page were checked before the run (scan only, no LLM) to confirm the pages contain the intended violations.
- The model alone rated the checkout contrast bug major on all three models; critical comes from the code override.
