# AI Output Review

## Review Process

Every AI-generated bug report was reviewed across five lenses before being accepted.

## 1. Intent Review

**Question:** Does the generated bug report correctly describe the accessibility violation?

**Finding:** In 3 of 15 generated reports, the LLM described the *symptom* but misidentified the *root cause*.

**Error caught and corrected:**
- **Violation:** `button-name` on the remove button (×) in cart.html
- **AI generated:** "Button has no accessible name because it uses a special character"
- **Actual issue:** The × symbol IS visible text, but axe-core flags it because screen readers may announce it as "times" or "multiplication sign" — the fix needs aria-label, not because there's no name, but because the name is ambiguous
- **Correction:** Updated system prompt to clarify that icon/symbol buttons need aria-label even when they have visible text content, because the text may not convey purpose to assistive technology users

## 2. Tests Review

**Question:** Are the steps_to_reproduce accurate and reproducible?

**Finding:** Generated steps were reproducible in 12/15 cases. Three failures:
- Steps referenced "scroll to element" when element was above the fold
- Steps said "click on X" for a keyboard-accessibility violation (contradictory)
- Steps omitted the prerequisite of having items in cart for cart.html violations

**Mitigation:** Added validation in pipeline that steps don't reference mouse actions for keyboard-related violations.

## 3. Security Review

**Question:** Does the tool or its output introduce security risks?

**Checked:**
- [x] `.env` is gitignored — API keys not exposed
- [x] Portkey API key passed via headers, not URL parameters
- [x] No user data collected or stored
- [x] HTML fixtures contain no real customer/product data
- [x] LLM output is written to local JSON only, not executed
- [x] No eval() or dynamic code execution on AI output

**Finding:** The `generate.js` fallback path uses `violation.helpUrl` in output — this is a delib axe-core URL (dequeuniversity.com), not user-controlled, so not an injection vector. But noted that if scanning user-provided URLs, the URL field in output should be sanitized.

## 4. Performance Review

**Question:** Is the pipeline efficient enough for practical use?

**Measured (4-fixture average):**
| Stage | Time |
|-------|------|
| Scan (Puppeteer launch + axe-core) | 3.2s |
| Deduplication | <10ms |
| Embedding (per violation) | 0.4s |
| LLM generation (per violation) | 2.1s |
| Total for 5 violations | ~16s |
| Total for checkout.html (8 violations) | ~24s |

**Assessment:** Acceptable for CI integration or manual runs. Not suitable for real-time (would need caching of embeddings per rule ID). The 500ms delay between LLM calls is conservative — could be reduced with Portkey rate limit monitoring.

## 5. Maintainability Review

**Question:** Can this code be maintained and extended by another QA engineer?

**Checked:**
- [x] Each module has a single responsibility
- [x] Pipeline stages are independently testable
- [x] WCAG data is in plain markdown (easy to update when WCAG 2.2 ships)
- [x] No circular dependencies between modules
- [x] Error handling produces actionable messages

**Finding:** The `generate.js` system prompt is 1400 characters embedded inline. If the prompt needs iteration, it should be extracted to a separate file. Left as-is for prototype but noted as tech debt.

## Summary

| Lens | Pass/Fail | Issues Found |
|------|-----------|--------------|
| Intent | Pass with corrections | 3/15 root cause misidentified |
| Tests | Pass with corrections | 3/15 steps not reproducible |
| Security | Pass | No vulnerabilities found |
| Performance | Pass | 16–24s per page acceptable |
| Maintainability | Pass | System prompt extraction noted |
