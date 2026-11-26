# L1-A11y-auto-traige-updated

Scans e-commerce pages with axe-core (plus one custom check), retrieves the relevant WCAG 2.1 AA criteria from a local knowledge base, and generates structured, Jira-ready bug reports with Groq.

```
URL / file > Playwright + axe-core (+ placeholder check) > dedup > TF-IDF retrieval over data/wcag > Groq LLM > bug-log JSON
```

## Run it

```bash
npm install && npx playwright install chromium
cp .env.example .env            # add GROQ_API_KEY (optional: GROQ_MODEL, GROQ_MAX_TOKENS, USE_CLAUDE_MD=0)
npm run ingest                  # build the WCAG store
npm run pipeline -- fixtures/cart.html
npm test                        # 35 Playwright tests (scan, RAG, retrieval eval, dedup, generator, triage summary)
npm run eval:retrieval          # retrieval metrics, no network
node scripts/measure.js evidence/runs/with-claude-md-v2 --table   # recompute accuracy metrics
```

## Layout

| Path | Contents |
|---|---|
| `src/` | scanner, RAG (`src/rag/`), generator, pipeline, dedup |
| `data/wcag/` | 10 WCAG success-criterion documents; `data/retrieval-eval.json` evaluation queries |
| `fixtures/`, `fixtures/holdout/` | synthetic pages: 4 original, 4 held-out |
| `docs/` | SPEC, PLAN, TASKS, TRACEABILITY, failure analysis, AI output review, context engineering, `specs/` |
| `n8n/` | n8n workflow (`workflow.json`) and how to run it; evidence in `evidence/n8n/` |
| `evidence/` | raw run results (`data/`, `rerun/`, `runs/`), metrics, summary and presentation files |

## Results (and their limits)

- Citation accuracy 9/11 (82%) on the first run, 11/11 and 12/12 after code fixes, 16/16, 16/16 and 15/16 on four held-out pages across three models. Targets: 85% citation, 75% actionable fix. Limits: n = 11-16, same author wrote fixtures and pipeline, original model (Llama 3.3 70B) is retired so current numbers use gpt-oss and qwen models.
- Retrieval: the old ranking scored below an always-4.1.2 baseline on 50 test queries (40% vs 54% hit@1); TF-IDF raises it to 54% (hit@3 78% to 90%), which only matches that baseline. See `docs/RETRIEVAL_EVAL_RESULTS.md`.
- CLAUDE.md has no reliable measured effect on severity (did not replicate); the checkout-always-critical rule is enforced in code. See `docs/CONTEXT_ENGINEERING.md`.

## Automation (n8n)

`n8n/workflow.json` runs the pipeline on a weekday schedule (or manually), summarises each result as a Jira-shaped payload and routes critical bugs to a mock alert. Spec first (`docs/specs/N8N_WORKFLOW.md`), then built, imported and executed twice with the n8n CLI: run 1 produced 9 bug logs and one alert, run 2 reported nothing new (dedup). Limits: executed locally only, not deployed or left scheduled; alert and Jira are mocked. See `n8n/README.md` and `evidence/n8n/RUNS.md`.

## Review findings and fixes

| Finding | Fix | Where |
|---|---|---|
| Docs written before the code they describe | Failure analysis and output review rewritten from real runs | `docs/FAILURE_ANALYSIS.md`, `docs/AI_OUTPUT_REVIEW.md` |
| Spec/plan/CLAUDE.md describe a different toolchain | Reconciled with Playwright, Groq, keyword/TF-IDF | `docs/SPEC.md`, `docs/PLAN.md`, `CLAUDE.md`, `docs/TRACEABILITY.md` |
| No tests behind `npm test` | 35 tests | `tests/` |
| Accuracy claim with no data | Raw results and recomputable metrics | `evidence/`, `scripts/measure.js` |
| Failure scenario not reproducible | Failures cite saved result files; gaps fixed and re-measured | `evidence/runs/RUNS.md` |
