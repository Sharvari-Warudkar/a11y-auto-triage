# Traceability: requirement to task to code to test to evidence

| Requirement (docs/SPEC.md) | Tasks | Code | Tests | Evidence |
|---|---|---|---|---|
| Scan URLs with axe-core via Playwright | T2.1, T2.2 | `src/scan.ts` | `tests/scan.test.ts` (6) | `fixtures/`, `evidence/data/` |
| Close axe-core gap (placeholder-only inputs) | T8.3 | `findPlaceholderOnlyInputs()` in `src/scan.ts` | `tests/scan.test.ts` | `evidence/runs/with-claude-md-v2/` |
| RAG over WCAG 2.1 docs, keyword/TF-IDF | T3.1-T3.4, T9.1-T9.6 | `src/rag/*` | `tests/rag.test.ts` (8), `tests/retrieval.test.ts` (8) | `docs/RETRIEVAL_EVAL_RESULTS.md`, `data/retrieval-eval.json` |
| Structured bug logs from an LLM | T4.1, T4.2, T8.1 | `src/generate.ts`, `src/types.ts` | `tests/generate.test.ts` (6) | `evidence/runs/` |
| Rules from CLAUDE.md applied (context engineering) | T6.x, T8.2, T8.4 | `loadProjectContext()`, `applyProjectSeverityRules()` | `tests/generate.test.ts` | `docs/CONTEXT_ENGINEERING.md` |
| Deduplicate violations already filed | T4.3 | `src/deduplicate.ts` | `tests/deduplicate.test.ts` (3) | `data/filed-violations.json` (gitignored) |
| Jira-ready JSON output | T5.1 | `src/pipeline.ts` | end-to-end runs | `evidence/data/*.json` |
| Success metrics (85% citation, 75% actionable fix, <5 min) | T7.3, T8.5, T8.6 | `scripts/measure.js` | n/a (recomputed from raw files) | `evidence/runs/RUNS.md`, `evidence/data/METRICS.md` |

Test total: 31 (`npm test`).

## How the spec evolved (from git history)

| Date | Commit | Event |
|---|---|---|
| 2026-08-10 | `e160ca5`, `ee2820c`, `0b93687` | Spec, plan and task list committed, before the implementation commit (`c049722`) |
| 2026-08-10/11 | `f489242`, `bdd789b` | Build diverged from the spec: Puppeteer to Playwright, embeddings to keyword matching, Portkey/Claude to Groq. The spec was not updated at the time |
| 2026-08-14 | `c12b856` | Spec, plan, CLAUDE.md and reports reconciled with what was built, after review feedback |
| 2026-11-23/25 | `a08108d` onward | Metrics recounted from raw results; model note added (Llama 3.3 70B retired) |
| 2026-11-26 | `09954a9` | Retrieval evaluation spec written first (`docs/specs/RETRIEVAL_EVAL.md`), then implemented and measured against its acceptance criteria |

The divergence on 2026-08-10/11 and its late reconciliation is a process lapse; it is recorded here rather than hidden. The retrieval work is the example of the intended order (spec, then tasks, then code, then measurement against pre-stated criteria).
