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

### What the evidence shows (updated 2026-11-26 after repeat runs)
- **The severity effect did not replicate.** In the first pair of runs the rules seemed to cut critical ratings from 6 to 3. A repeat run of the same pipeline with the rules on rated 5 of the same 11 bugs critical (model's own severity, before the code override described below). With-rules runs gave 3 and 5, without-rules gave 6, so the difference is within run-to-run noise. No reliable effect of CLAUDE.md on severity is established.
- **Citation, parse success and fix quality did not depend on CLAUDE.md.** Those gains come from code (see FAILURE_ANALYSIS.md, follow-up section).
- **The model does not reliably follow the checkout rule.** CLAUDE.md says checkout violations are always critical. The model rated the checkout `color-contrast` bug "major" in every run I examined (both arms, the repeat run and all three held-out models), and also the `placeholder-only-label` bug in 2 of 3 held-out runs.
- **Selector citation barely changed (4/11 vs 3/11)**, which is within noise.

### Enforcement in code
Because prompting alone did not enforce the rule, `applyProjectSeverityRules()` in `src/generate.ts` sets severity to critical for checkout pages when CLAUDE.md rules are enabled. The model's own value is kept in `_severity_override.from`, so the override is visible in every result. Result: checkout bugs are critical in 3/3 (original fixtures) and 4/4 (held-out `checkout-payment.html`) for all models. This is a hard-coded rule in code, not evidence that the context file worked.

### Limits
n = 11 to 16 per run, one run per configuration, so single-item differences are noise. The with/without comparison measures only the prompt; the code override is switched off together with CLAUDE.md (`USE_CLAUDE_MD=0`).
