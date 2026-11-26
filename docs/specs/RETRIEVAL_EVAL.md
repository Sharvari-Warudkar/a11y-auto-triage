# Spec: Retrieval evaluation and ranking improvement

Status: written BEFORE implementation (see git history: this file is committed before any code that implements it).

## Problem

Retrieval is the RAG half of the pipeline. Today the expected WCAG criterion is the top result for only about 55-65% of violations (measured in `evidence/runs/RUNS.md`: 6/11 and 7/11, 9/16 on held-out pages), although it is within the top 3 almost always. Two things are wrong:

1. There is no retrieval-only evaluation. Retrieval quality is inferred indirectly from the LLM's final citation.
2. The docs call the method "TF-IDF", but `src/rag/embeddings.ts` computes cosine similarity over raw term counts with no IDF, no stopword removal and no field weighting, so common words ("element", "user", "content") dominate.

## Goals

- G1. A repeatable retrieval evaluation (no LLM, no network) with a labelled query set and standard metrics.
- G2. A ranking change that measurably improves top-1 accuracy, judged on queries that were not used to choose the change.

## Labelled query set (`data/retrieval-eval.json`)

- Queries use exactly what the pipeline sends: `<rule id> <help> <description>` from axe-core's own rule metadata (plus the project's custom `placeholder-only-label` rule).
- Acceptable criteria for a rule = the success criteria in axe-core's `wcag###` tags that exist in `data/wcag/`, plus the project mapping already used by `scripts/measure.js` (for example `label` accepts 3.3.2 as well as 4.1.2). Rules with no acceptable criterion in the corpus (for example `document-title`, SC 2.4.2) are excluded and listed as out of coverage.
- Split, fixed now: **tune** = the 5 rules seen in the original four fixtures (`color-contrast`, `image-alt`, `label`, `select-name`, `html-has-lang`); **test** = every other rule. Parameters are chosen from the spec below, not from test-split results.

## Metrics

- hit@1 (expected criterion ranked first), hit@3, MRR. Reported for the tune and test splits separately, for the baseline and for the new ranking.

## Change under test (parameters fixed here, not tuned)

Replace raw-count cosine with a real TF-IDF ranking:
- IDF = ln(1 + N / df) over the corpus (N documents, df = documents containing the term).
- Stopword removal using a short fixed list plus the corpus-wide filler words ("user", "users", "element", "elements", "content", "page", "must", "should").
- Title boost: terms that appear in the document title count x2.
- Score = cosine of TF-IDF vectors. No other parameters.

The baseline ranking stays available (`searchBaseline`) so the comparison can be rerun at any time.

## Acceptance criteria

- A1. `npm run eval:retrieval` prints hit@1, hit@3, MRR for baseline and new ranking, per split, with no network access.
- A2. New ranking improves **test-split hit@1 by at least 10 percentage points** over baseline.
- A3. New ranking does not reduce test-split hit@3 or MRR.
- A4. If A2 or A3 is not met, the docs say so and the baseline stays the default. Parameters are not re-tuned to pass.
- A5. Unit tests cover IDF weighting, stopword removal and the evaluation harness. Existing 23 tests keep passing.
- A6. Docs that call the method "TF-IDF" are accurate for the shipped ranking (and say "term-count cosine" if the baseline is kept).

## Out of scope

Vector embeddings, new WCAG documents, changes to the LLM prompt, retrieval of more than 3 results.

## Tasks

- [x] T9.1 Query-set builder script and `data/retrieval-eval.json` (labels derived from axe-core's own wcag tags plus one project mapping; rules with no criterion in the corpus excluded; documented in the script header)
- [x] T9.2 Evaluation harness `src/rag/evaluate.ts` and `npm run eval:retrieval`; record the baseline
- [x] T9.3 TF-IDF ranking per the parameters above; keep `searchBaseline`
- [x] T9.4 Unit tests
- [x] T9.5 Run the evaluation once, record results in `docs/RETRIEVAL_EVAL_RESULTS.md`, apply A4 if needed
- [x] T9.6 Update SPEC/PLAN/README wording
