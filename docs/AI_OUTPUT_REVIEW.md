# AI Output Review

Based on actual pipeline output from runs on 2026-08-14 against all 4 fixtures (11 violations total).

## 1. Intent Review

**Question:** Does the generated bug report correctly describe the accessibility violation?

**Method:** Compared each generated bug log against the raw axe-core violation data and the actual HTML in the fixture.

**Findings (11 bug logs reviewed):**
- 9/11 correctly describe the violation and its impact
- 1/11 has a parse error (select-name on checkout.html) — fell back to generic template
- 1/11 cites a criterion outside the corpus: cart.html `html-has-lang` cites 3.1.1 (correct in the real WCAG, but not in `data/wcag/`, breaking the cite-only-corpus-IDs rule)

**Error caught and corrected:**
- **Violation:** `color-contrast` on `checkout.html` — the error message element `#card-error`
- **LLM generated severity:** `"major"` 
- **My assessment:** This should be `"minor"` — the error message is supplementary text, and the contrast ratio (2.04) is low but the message also appears when there's a validation error (not always visible). A user who can't read it still gets blocked at form submission, making the actual severity context-dependent.
- **Decision:** Left as "major" — the LLM's reasoning (it's on a checkout form where errors block completion) is defensible even though I initially thought it should be "minor". This is a case where reasonable people disagree.

## 2. Tests Review

**Question:** Are the steps_to_reproduce accurate and reproducible?

**Findings:**
- 6/11 contain readable step text (2 clean arrays, 3 mixed with stray numbers, 1 generic fallback string)
- 5/11 are numeric-only arrays such as `[1, 2]` (listing image-alt, detail contrast, cart lang/alt/labels): not reproducible

**Specific example of bad output (product-listing.html, image-alt violation):**
```json
"steps_to_reproduce": [1, 2]
```
This is not reproducible by a developer. The LLM produced numeric indices instead of step descriptions.

## 3. Security Review

**Checked:**
- [x] `.env` is gitignored — Groq API key not in committed code
- [x] No user data collected or stored
- [x] HTML fixtures contain no real customer/product data
- [x] LLM output is written to local JSON only, not executed
- [x] No `eval()` or dynamic code execution on AI output
- [x] Violation `helpUrl` in fallback output points to dequeuniversity.com (safe, not user-controlled)

**Finding:** The `.env.example` file previously contained a real API key that was committed to git. This was caught by GitHub push protection and fixed (commit 7ffbfef). The exposed key should be rotated after evaluation.

## 4. Performance Review

**Approximate timings observed during the 2026-08-14 runs (not recorded in the results files, which only store scan timestamps):**

| Fixture | Violations | Total Time | Avg per violation |
|---------|-----------|------------|-------------------|
| product-listing.html | 2 | ~18s | ~9s |
| product-detail.html | 3 | ~25s | ~8s |
| cart.html | 4 | ~30s | ~7.5s |
| checkout.html | 2 | ~15s | ~7.5s |

**Breakdown per stage:**
- Scan (Playwright + axe-core): ~3-4s
- Retrieval (keyword matching): <100ms total
- LLM generation (Groq): ~2-3s per violation
- Rate limit delays: 500ms between calls

**Assessment:** Total time per page is 15-30 seconds depending on violation count. Compared to manual triage (~45 minutes), this is a 90-120x improvement. The bottleneck is LLM generation (sequential, one call per violation).

## 5. Maintainability Review

**Checked:**
- [x] Each module has a single responsibility (scan, retrieve, generate, deduplicate, orchestrate)
- [x] TypeScript interfaces in `types.ts` define all shared shapes
- [x] Pipeline stages are independently callable
- [x] No circular dependencies
- [x] WCAG data is plain markdown (easy to add new criteria)

**Issue found:** The `generate.ts` system prompt is a 1400-character string literal embedded in the source file. If the prompt needs iteration, there's no way to change it without modifying code. Should be extracted to a config file for production.

## Summary Table

| Lens | Result | Evidence |
|------|--------|----------|
| Intent | 9/11 correct | 1 parse error, 1 criterion outside corpus (3.1.1) |
| Tests (reproducibility) | 6/11 readable | 5 numeric-only, 3 mixed, 2 clean, 1 generic string |
| Security | Pass | Key exposure caught and mitigated |
| Performance | 15-30s per page | 90x faster than manual |
| Maintainability | Pass with note | System prompt should be extracted to config |

---

## Follow-up (2026-11-25): re-review after fixes

The same five lenses were re-applied to the new runs (`evidence/runs/`):

| Lens | Before (Llama 3.3, 2026-08-14) | After (gpt-oss-120b, improved code) |
|---|---|---|
| Intent | 9/11 correct | 11/11 cite a correct, in-corpus criterion |
| Tests (reproducibility) | 6/11 readable steps | 11/11 clean string steps (normalised in code) |
| Security | Pass | Pass; the new key is only in `.env` (gitignored), the old one was rotated |
| Performance | 15-30s per page | Dominated by Groq rate limits (HTTP 429, 10s waits); same order |
| Maintainability | System prompt was a string literal | Rules now live in CLAUDE.md and load at runtime; helpers have unit tests (23 tests) |

Resolved since the first follow-up: axe-core's placeholder-only blind spot (custom check added) and the checkout rule (enforced in code, 3/3 and 4/4 checkout bugs critical; the model alone rated checkout contrast "major" in every run). Still open: severity has no ground truth, and the apparent effect of CLAUDE.md on severity did not replicate across repeat runs (CONTEXT_ENGINEERING.md). Generalisation was checked on four held-out pages (16/16, 16/16, 15/16 correct citations across three models).
