# Failure Analysis

## Specific Inputs That Break the Prototype

### Failure 1: Overlapping violations on the same element

**Input:** `fixtures/checkout.html` — the `<input type="text" placeholder="Full Name" id="name">` element

**What breaks:** This element triggers BOTH `label` (no associated label) AND `color-contrast` (placeholder text too light). The RAG retrieval returns criteria for 3.3.2 (Labels) for both violations, because the embedding for "input without label" is close to "input with insufficient contrast on placeholder."

**Wrong output:** The bug report for the contrast violation cites SC 3.3.2 (Labels or Instructions) instead of SC 1.4.3 (Contrast Minimum).

**Root cause:** Cosine similarity between "placeholder text contrast" and "labels for inputs" is high because both discuss form inputs. The retrieval doesn't distinguish between the violation *type* — it retrieves by element context, not by rule category.

**Potential fix:** Add pre-filter by axe-core rule tags before RAG retrieval. If the violation is tagged `wcag143`, only retrieve from criteria 1.4.x family.

---

### Failure 2: Multiple nodes per violation collapse into one report

**Input:** `fixtures/product-listing.html` — three product cards each missing alt text on images

**What breaks:** axe-core returns one violation (rule: `image-alt`) with three nodes (one per image). The pipeline generates ONE bug report for the violation, listing all three images. But in Jira, a developer fixing one image might close the ticket, leaving the other two unfixed.

**Wrong output:** Single bug report with title "Images must have alternate text" covering 3 different elements.

**Expected:** Three separate bug reports, one per element, so each can be individually tracked and resolved.

**Root cause:** Pipeline iterates over violations, not over nodes within violations. The deduplication works at the node level but generation doesn't.

**Potential fix:** Flatten violations to one-bug-per-node before the generation step. Trade-off: increases LLM calls and may produce repetitive tickets for truly identical violations (e.g., three identical product card images).

---

### Failure 3: Severity inconsistency for "borderline" contrast ratios

**Input:** Element with contrast ratio 4.4:1 (just below 4.5:1 threshold)

**What breaks:** The LLM assigns "critical" severity because it reads "fails WCAG," but the CLAUDE.md severity rules define critical as "blocks entire user group." A 4.4:1 ratio is technically failing but practically readable for most users.

**Wrong output:** `"severity": "critical"` for a 4.4:1 contrast ratio that is 0.1 below threshold.

**Expected:** `"severity": "minor"` — technically non-compliant but minimal real-world impact.

**Root cause:** The system prompt severity mapping doesn't account for the continuous nature of contrast ratios. It treats all contrast failures equally regardless of how far below the threshold they fall.

**Potential fix:** Add contrast-specific severity logic: ratio >= 4.0 = minor, ratio >= 3.0 = major, ratio < 3.0 = critical. This would require parsing the ratio from axe-core's node data.

---

### Failure 4: Focus-visible violations produce vague fix suggestions

**Input:** `fixtures/product-detail.html` — size buttons with `outline: none`

**What breaks:** The LLM suggests "Add a visible focus indicator" but doesn't specify what CSS to add. This is the same vague advice a developer would get from the WCAG docs directly — the tool adds no value.

**Wrong output:**
```json
"suggested_fix": "Add a visible focus indicator to the .size-btn elements when they receive keyboard focus"
```

**Expected:**
```json
"suggested_fix": "Replace .size-btn:focus { outline: none; } with .size-btn:focus-visible { outline: 2px solid #0066cc; outline-offset: 2px; }"
```

**Root cause:** The WCAG criterion document for 2.4.7 describes *what* focus-visible means but doesn't provide CSS snippets. The RAG retrieval gives the model the principle but not the implementation pattern.

**Potential fix:** Add a "common fixes" section to each WCAG data file with code snippets for the most frequent violations of that criterion.

---

### Failure 5: Dynamic content not captured

**Input:** Any page that loads product data via JavaScript after initial render

**What breaks:** Even with `waitUntil: 'networkidle0'`, some SPAs inject content after a user interaction (e.g., infinite scroll, tab switching). The scanner captures the initial state only.

**Not tested in fixtures (all static HTML), but documented as known limitation.**

**Potential fix:** Add configurable wait time + action sequences (click tab, scroll down) before scanning. Out of scope for this prototype.

## Measured Improvement

### Before fix: criterion citation accuracy
- 15 violations scanned across 4 fixtures
- 12/15 cited the correct WCAG criterion (80%)
- 3/15 cited a related but wrong criterion due to embedding similarity

### After fix: added rule-tag pre-filter
After adding logic to filter WCAG chunks by the violation's tag family before retrieval:
- 14/15 cited the correct criterion (93%)
- 1/15 still wrong (violation tagged `best-practice` has no WCAG tag to filter by)

### What got worse
- Retrieval time increased by ~50ms per violation (additional filtering step)
- For violations that span multiple WCAG criteria (e.g., missing label affects both 1.3.1 and 3.3.2), the pre-filter sometimes excludes the secondary relevant criterion
