# Re-run of the pipeline (2026-11-25, model: openai/gpt-oss-120b)

Why: the original results (evidence/data, 2026-08-14) used `llama-3.3-70b-versatile`, which the Groq account no longer serves (HTTP 404 model_not_found). The model is now configurable via `GROQ_MODEL` in `.env` (default unchanged). This re-run used `openai/gpt-oss-120b`, the same prompts, `max_tokens` 1000, 4 fixtures, dedup skipped. Raw output: the four `bugs-*.json` files in this folder.

| Metric | Original (Llama 3.3 70B) | Re-run (gpt-oss-120b) |
|---|---|---|
| Violations found by axe-core | 11 | 11 (identical scan) |
| LLM parse success | 10/11 | 9/11 (both contrast bugs on product-listing and product-detail fell back to the template) |
| Correct criterion in bug log (in corpus) | 9/11 (82%) | 8/11 (73%): 2 parse errors, html-has-lang cites 3.1.1 (not in corpus) again |
| Readable steps_to_reproduce | 6/11 | 11/11 (9 clean arrays, 2 fallback strings); no numeric-only arrays |
| Fix names a concrete attribute/code | 6/11 | 9/11 (the 2 fallbacks are link-only); contrast fixes now include example CSS on cart and checkout |

Takeaways: the scan stage reproduces exactly; the numeric-steps failure (5/11 originally) did not recur on this model, so it is model-dependent; the html-has-lang citation outside the corpus and the parse-error fallback recur, so those are pipeline issues (no corpus doc for 3.1.1; fixed `max_tokens` with a reasoning model). The two parse errors have not been root-caused; a likely cause is reasoning tokens consuming the 1000-token budget (set `GROQ_MAX_TOKENS` higher to test).
