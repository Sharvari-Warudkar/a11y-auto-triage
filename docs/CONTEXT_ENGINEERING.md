# Context Engineering Evidence

## The context artifact: CLAUDE.md

`CLAUDE.md` holds the project rules. Since 2026-11-25 `src/generate.ts` loads these sections of `CLAUDE.md` at runtime and appends them to the system prompt (`loadProjectContext()` / `buildSystemPrompt()`):

- Bug Report Output Schema
- Severity Rules
- WCAG Criterion Citation Rules (most specific criterion, only IDs from `data/wcag/`)
- Fix Suggestion Rules (actionable, specific attribute, reference the selector)
- E-commerce Domain Context (checkout violations are always critical)

The base prompt keeps only the role and the JSON field list. Setting `USE_CLAUDE_MD=0` removes the CLAUDE.md block, which makes a controlled with/without comparison possible.

**Correction to earlier versions of this document:** the 2026-08-14 runs used a prompt with an inline severity table and no checkout rule, so the earlier claim that "checkout = critical" came from CLAUDE.md was not supported. There was no controlled comparison at that time. This document replaces it.

## Controlled comparison (2026-11-25)

Setup: same code, same model (`openai/gpt-oss-120b`), same prompts, same 4 fixtures (11 violations), `temperature` 0.2, one run per arm. The only difference is `USE_CLAUDE_MD=1` vs `0`. Raw output: `evidence/runs/with-claude-md/` and `evidence/runs/without-claude-md/`. Metrics: `node scripts/measure.js <dir>`.

| Metric | With CLAUDE.md | Without CLAUDE.md |
|---|---|---|
| Parse success | 11/11 | 11/11 |
| Correct criterion (from corpus) | 11/11 | 11/11 |
| Actionable fix | 11/11 | 11/11 |
| Fix names the element selector | 4/11 | 3/11 |
| Severity distribution | 8 major, 3 critical | 5 major, 6 critical |
| Checkout `color-contrast` severity | major | major |
| Checkout `select-name` severity | critical | critical |

### What the evidence shows
- **Severity is the one clear effect.** Without the rules the model rates 6/11 bugs critical, including missing alt text on the product-listing and cart images and the cart/detail label bugs. With the rules it rates 3/11 critical, in line with the "blocks an entire user group from completing a task" definition. This shows the rules change behaviour; it does not prove either distribution is the correct one, since there is no ground-truth severity.
- **Citation, parse success and fix quality did not depend on CLAUDE.md** in this run. The citation and fix gains come from code (see FAILURE_ANALYSIS.md, follow-up section), not from the context file.
- **The checkout rule was not followed.** CLAUDE.md says checkout violations are always critical, yet the checkout `color-contrast` bug is "major" in both arms. The context did not constrain the output here.
- **Selector citation barely changed (4/11 vs 3/11)**, which is within run-to-run noise.

### Limits
n = 11 per arm, one run each, one model, no repeats. Differences of one item are noise. Only the severity shift (3 critical vs 6) is large enough to be worth reporting, and it should be re-checked with repeated runs before being relied on.
