# Retrieval evaluation results

Spec: `docs/specs/RETRIEVAL_EVAL.md` (committed before the implementation, `09954a9`). Reproduce with `npm run eval:retrieval` (no network, no LLM). Query set: `data/retrieval-eval.json`, built by `scripts/build-retrieval-eval.js` from axe-core's rule metadata.

## Results (55 queries: tune 5, test 50)

| Ranking | Split | n | hit@1 | hit@3 | MRR |
|---|---|---|---|---|---|
| Majority class (always 4.1.2 first) | test | 50 | 54.0% | 86.0% | 0.712 |
| Baseline: term-count cosine | tune | 5 | 80.0% | 100% | 0.900 |
| Baseline: term-count cosine | test | 50 | 40.0% | 78.0% | 0.603 |
| New: TF-IDF (IDF + stopwords + title x2) | tune | 5 | 100% | 100% | 1.000 |
| New: TF-IDF (IDF + stopwords + title x2) | test | 50 | 54.0% | 90.0% | 0.707 |

## Acceptance criteria

| Criterion | Result |
|---|---|
| A1 command prints the metrics offline | Met |
| A2 test hit@1 improves by at least 10 points | Met: 40.0% to 54.0% (+14.0) |
| A3 test hit@3 and MRR do not drop | Met: hit@3 78% to 90%, MRR 0.603 to 0.707 |
| A4 baseline stays default if A2/A3 fail | Not needed; TF-IDF is now the default `search()` |
| A5 unit tests | Met: 8 tests in `tests/retrieval.test.ts` (one asserts A2/A3), 35 tests total |
| A6 docs accurate | Met: the old code did not compute IDF; the shipped default now does |

Parameters (IDF = ln(1 + N/df), fixed stopword list, title x2) were fixed in the spec and not changed after seeing results.

## What this does and does not show

- **The old ranking was weaker than it looked.** Its test hit@1 (40%) was below the trivial "always 4.1.2" ranker (54%), because 4.1.2 is the acceptable answer for 29 of 55 queries (class imbalance). The earlier "TF-IDF" label was inaccurate: no IDF was computed.
- **The improvement is real over the baseline but only matches the majority ranker.** New test hit@1 equals majority-class hit@1 (54%) and MRR is marginally lower (0.707 vs 0.712). It is better at hit@3 (90% vs 86%). It does not yet prove the retriever is better than a prior on ARIA-type rules.
- **Remaining misses (23 of 50 test queries)** are mostly ARIA and structure rules (for example `aria-required-attr`, `listitem`, `th-has-data-cells`) where the corpus has no document written for that topic, so the answer depends on generic wording. Adding corpus documents (or per-rule hints) would be the next step; it was out of scope for this spec.
- **Rules that appear in the project's fixtures:** hit@1 is 8 of 9 for the new ranking (was 6 of 9). `color-contrast` now ranks 1.4.3 first (the old ranking put 1.4.11 first) and `button-name` is fixed. `link-name` still misses (1.4.3 first, expected 4.1.2).
- **Limits:** the tune split has only 5 queries; labels come from axe-core's tags plus one project mapping (`label` also accepts 3.3.2); the LLM pipeline was not re-run for this change, so end-to-end effects are not measured. The saved pipeline results in `evidence/runs/` used the baseline ranking.
