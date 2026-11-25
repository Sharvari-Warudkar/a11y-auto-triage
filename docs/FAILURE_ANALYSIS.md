# Failure Analysis

Based on actual pipeline runs against all 4 fixtures on 2026-08-14.

## Run Summary

| Fixture | Violations Found | Bug Logs Generated | Parse Errors |
|---------|-----------------|-------------------|--------------|
| product-listing.html | 2 | 2 | 0 |
| product-detail.html | 3 | 3 | 0 |
| cart.html | 4 | 4 | 0 |
| checkout.html | 2 | 2 | 1 |
| **Total** | **11** | **11** | **1** |

## Failure 1: LLM Output Parse Error on `select-name` Violation

**Input:** `fixtures/checkout.html` — the `<select id="state">` element without an associated label

**What happened:** The LLM (Groq/Llama 3.3) returned a response wrapped in markdown code fences (` ```json ... ``` `) that was truncated mid-response. The JSON cleaning regex removed the fences but the content was incomplete, causing `JSON.parse()` to fail.

**Actual output (from results/bugs-1786696000893.json):**
```json
{
  "title": "Select element must have an accessible name",
  "severity": "critical",
  "wcag_criterion": "unknown",
  "affected_users": ["unknown"],
  "_parse_error": true
}
```

**Expected:** A fully structured bug report with specific WCAG criterion (should be 4.1.2 or 3.3.2), specific affected users, and actionable fix suggestion.

**Root cause:** The Groq API's `max_tokens: 1000` limit truncated the response for this violation because the prompt was long (the `select-name` violation's HTML context plus 3 WCAG documents exceeded the input length where 1000 output tokens was insufficient).

**Impact:** 1 of 11 total bug logs (9%) fell back to the generic template instead of getting a properly generated report.

---

## Failure 2: Retrieval Returns Irrelevant Third Match

**Input:** All violations — observable in `_metadata.retrievedCriteria`

**What happened:** The keyword matching consistently returns `2.1.1-keyboard` or `1.4.3-contrast-minimum` as the 2nd or 3rd match for violations where those criteria are not relevant.

**Evidence from actual output:**
- `color-contrast` violation retrieves: `1.4.11-non-text-contrast`, `1.4.3-contrast-minimum`, **`2.1.1-keyboard`** ← irrelevant
- `image-alt` violation retrieves: `1.1.1-non-text-content`, **`1.4.3-contrast-minimum`** ← irrelevant, `4.1.2-name-role-value`
- `html-has-lang` violation retrieves: `1.3.1-info-and-relationships`, `2.1.1-keyboard`, `2.4.7-focus-visible` ← all irrelevant (no language criterion in corpus); the LLM then cited 3.1.1 from its own knowledge

**Root cause:** Keyword/TF-IDF matching lacks semantic understanding. Common words like "user", "content", "element" appear in all WCAG documents, causing high similarity scores even for unrelated criteria. The `2.1.1-keyboard` document matches broadly because "keyboard" + "interactive" + "user" overlap with many violation descriptions.

**Impact:** The LLM receives irrelevant context in position 2 or 3, which can occasionally cause it to cite the wrong criterion. Measured from `_metadata.retrievedCriteria`: the correct criterion is in position 1 for only 6/11 (image-alt x3, label x2, select-name x1); for all 4 `color-contrast` violations position 1 is `1.4.11-non-text-contrast` and the correct `1.4.3` is position 2. The correct criterion appears somewhere in the top 3 for 10/11 (html-has-lang is the miss).

---

## Failure 3: `steps_to_reproduce` Format Inconsistency

**Input:** Across all fixtures

**What happened:** The LLM returns `steps_to_reproduce` in inconsistent formats:
- Sometimes as a string array: `["Open the webpage", "Navigate to...", "Observe..."]`
- Sometimes numeric-only: `[1, 2]` (5 of 11 bug logs: listing image-alt, detail contrast, cart lang/alt/labels)
- Sometimes mixed, with stray numbers between readable steps (3 of 11: detail image-alt, detail label, checkout contrast)
- Sometimes as a newline-separated string: `"1. Navigate to the page\n2. Observe the violation"`

**Evidence:** In `results/bugs-1786678851724.json`, the image-alt bug has:
```json
"steps_to_reproduce": [1, 2]
```
This is not valid steps — it's a number array instead of string descriptions.

**Root cause:** The system prompt says "numbered steps" but doesn't enforce the output schema strictly. Groq/Llama 3.3 interprets this ambiguously depending on how much context it's processing.

**Impact:** 5 of 11 bug logs have numeric-only steps (unusable) and 3 more have stray numbers mixed in. Only 2 are clean string arrays, plus 1 generic fallback string. 6/11 contain readable step text.

---

## Failure 4: Missing Violations Not Detected by axe-core

**Input:** `fixtures/checkout.html` — form inputs using only `placeholder` instead of `<label>`

**What happened:** The fixture has 8 text inputs without labels (Full Name, Email, Address, City, ZIP, Card Number, Expiry, CVV) but axe-core only reported `select-name` (1 violation for the select element). It did NOT report the missing labels on text inputs.

**Investigation:** axe-core treats `placeholder` as a sufficient accessible name for `<input>` elements under certain conditions. The fixture inputs DO have placeholder text, which axe-core accepts as providing an accessible name — even though WCAG best practice says placeholders should not be the only label.

**Root cause:** This is a known axe-core limitation — placeholder text satisfies the programmatic name check (SC 4.1.2) but fails the persistent-label requirement (SC 3.3.2). axe-core scans for programmatic names, not label persistence.

**Impact:** Real WCAG violations in our test fixtures go undetected. The pipeline can only report what axe-core finds — it cannot detect violations that axe-core itself misses.

---

## Failure 5: Generic Fix Suggestions

**Input:** All `color-contrast` violations across all 4 fixtures

**What happened:** Every contrast violation gets a near-identical generic suggestion: "Increase the darkness of the text color or lighten the background color to achieve a contrast ratio of at least 4.5:1"

**Expected:** Specific color values (e.g., "Change #aaaaaa to #595959")

**Evidence:** All four contrast violations (product-listing, product-detail, cart, checkout) received the same generic advice (ratio target 4.5:1, no colour values). In addition the checkout `select-name` fallback fix is only a dequeuniversity link.

**Root cause:** The WCAG context document for 1.4.3 mentions the principle but doesn't contain a mapping from specific color values to passing alternatives. The LLM doesn't perform contrast calculations — it can only parrot the principle.

**Impact:** The "suggested_fix" field fails to be code-level actionable for contrast violations specifically. A developer still needs to look up what color to use.

---

## Accuracy Summary (from actual data)

| Metric | Measured Value | Method |
|--------|---------------|--------|
| Violations detected | 11 across 4 fixtures | axe-core scan results |
| Correct WCAG criterion in the bug log | 9/11 (82%) | contrast→1.4.3 ✓ x4, image-alt→1.1.1 ✓ x3, label→3.3.2 ✓ x2, html-has-lang→3.1.1 ✗ (not in corpus), select-name→parse error ✗. Target was 85%: not met |
| Retrieval top-1 correct | 6/11 (55%) | from `_metadata.retrievedCriteria`; contrast top-1 is 1.4.11 in all 4 cases |
| Correct criterion within retrieved top-3 | 10/11 (91%) | miss: html-has-lang |
| Actionable fix suggestion | 6/11 (55%) | Names a concrete attribute/element: image-alt x3, label x2, lang x1. Not actionable: contrast x4 (generic), select-name fallback (link only). Target was 75%: not met |
| LLM parse success rate | 10/11 (91%) | 1 parse error on checkout select-name |
| Readable steps_to_reproduce | 6/11 (55%) | 5 numeric-only, 3 mixed with stray numbers, 2 clean arrays, 1 generic string |

Raw data: `evidence/data/` (the four `bugs-*.json` files) and `evidence/data/METRICS.md` (per-bug table).

---

## Follow-up (2026-11-25): fixes applied and remeasured

Each failure above was addressed or consciously left open. Full table and caveats: `evidence/runs/RUNS.md`.

| Failure | Fix | Result (gpt-oss-120b, 11 bugs) |
|---|---|---|
| 1. Parse error / truncation | `max_tokens` 4000, one retry with double budget, tolerant JSON extraction | 11/11 parsed |
| 2. Irrelevant retrieval matches | Ranking not changed; added the missing 3.1.1 document | Expected criterion top-1 7/11 (was 6/11), top-3 11/11 |
| 3. Numeric `steps_to_reproduce` | Schema asks for plain strings; `normalizeSteps()` drops bare numbers; fallback steps if fewer than 2 | 0 numeric-only, 11/11 clean |
| 4. Placeholder-only inputs missed by axe-core | **Not fixed.** axe-core limitation; would need a custom check | Still 2 reported on checkout |
| 5. Generic contrast fix | Fix computed in code from axe-core's measured colours | 4/4 contrast fixes name a passing hex value |

Citation accuracy is now 11/11 and actionable fixes 11/11, above the 85% and 75% targets. Treat this as optimistic: the fixes were tuned on these same four fixtures, there is no held-out set, n = 11 and it is one run on a different model than the original results.
