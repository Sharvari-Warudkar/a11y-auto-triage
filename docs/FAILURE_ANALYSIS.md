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
- `html-has-lang` violation retrieves: `1.4.3-contrast-minimum` ← irrelevant (no lang criterion in corpus)

**Root cause:** Keyword/TF-IDF matching lacks semantic understanding. Common words like "user", "content", "element" appear in all WCAG documents, causing high similarity scores even for unrelated criteria. The `2.1.1-keyboard` document matches broadly because "keyboard" + "interactive" + "user" overlap with many violation descriptions.

**Impact:** The LLM receives irrelevant context in position 2 or 3, which can occasionally cause it to cite the wrong criterion. However, position 1 is correct in 10/11 cases (91%).

---

## Failure 3: `steps_to_reproduce` Format Inconsistency

**Input:** Across all fixtures

**What happened:** The LLM returns `steps_to_reproduce` in inconsistent formats:
- Sometimes as a string array: `["Open the webpage", "Navigate to...", "Observe..."]`
- Sometimes with numeric indices: `[1, 2]` (product-listing.html, image-alt bug)
- Sometimes as a newline-separated string: `"1. Navigate to the page\n2. Observe the violation"`

**Evidence:** In `results/bugs-1786678851724.json`, the image-alt bug has:
```json
"steps_to_reproduce": [1, 2]
```
This is not valid steps — it's a number array instead of string descriptions.

**Root cause:** The system prompt says "numbered steps" but doesn't enforce the output schema strictly. Groq/Llama 3.3 interprets this ambiguously depending on how much context it's processing.

**Impact:** 2 of 11 bug logs have malformed steps_to_reproduce fields. A developer reading the ticket would not get useful reproduction steps.

---

## Failure 4: Missing Violations Not Detected by axe-core

**Input:** `fixtures/checkout.html` — form inputs using only `placeholder` instead of `<label>`

**What happened:** The fixture has 7 form inputs without labels (Full Name, Email, Address, City, ZIP, Card Number, Expiry, CVV) but axe-core only reported `select-name` (1 violation for the select element). It did NOT report the missing labels on text inputs.

**Investigation:** axe-core treats `placeholder` as a sufficient accessible name for `<input>` elements under certain conditions. The fixture inputs DO have placeholder text, which axe-core accepts as providing an accessible name — even though WCAG best practice says placeholders should not be the only label.

**Root cause:** This is a known axe-core limitation — placeholder text satisfies the programmatic name check (SC 4.1.2) but fails the persistent-label requirement (SC 3.3.2). axe-core scans for programmatic names, not label persistence.

**Impact:** Real WCAG violations in our test fixtures go undetected. The pipeline can only report what axe-core finds — it cannot detect violations that axe-core itself misses.

---

## Failure 5: Generic Fix Suggestions

**Input:** All `color-contrast` violations across all 4 fixtures

**What happened:** Every contrast violation gets the same generic suggestion: "Increase the darkness of the text color or lighten the background color to achieve a contrast ratio of at least 4.5:1"

**Expected:** Specific color values (e.g., "Change #aaaaaa to #595959")

**Evidence:** Three separate contrast violations (product-listing #aaaaaa, product-detail #cccccc, checkout #ff9999) all received the identical fix suggestion text.

**Root cause:** The WCAG context document for 1.4.3 mentions the principle but doesn't contain a mapping from specific color values to passing alternatives. The LLM doesn't perform contrast calculations — it can only parrot the principle.

**Impact:** The "suggested_fix" field fails to be code-level actionable for contrast violations specifically. A developer still needs to look up what color to use.

---

## Accuracy Summary (from actual data)

| Metric | Measured Value | Method |
|--------|---------------|--------|
| Violations detected | 11 across 4 fixtures | axe-core scan results |
| Correct WCAG criterion cited (top-1 retrieval) | 10/11 (91%) | Manually verified: contrast→1.4.3 ✓, image-alt→1.1.1 ✓, label→3.3.2 ✓, html-has-lang→no matching doc ✗, select-name→parse error ✗ |
| Actionable fix suggestion | 7/11 (64%) | Contrast fixes are generic (4 violations), 7 others are specific |
| LLM parse success rate | 10/11 (91%) | 1 parse error on checkout select-name |
