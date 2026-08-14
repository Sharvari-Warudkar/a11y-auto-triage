# Context Engineering Evidence

## The Context Artifact: CLAUDE.md

`CLAUDE.md` provides project-specific instructions that shape the system prompt used in `src/generate.ts`. The key sections that affect output quality:

1. **Severity Rules** — defines critical/major/minor/trivial with specific criteria
2. **Fix Suggestion Rules** — requires "specific attribute/property to add or change"
3. **E-commerce Domain Context** — maps violation types to business impact

## How Context Engineering Is Used in This Project

The CLAUDE.md file informed the system prompt in `generate.ts`. The prompt includes:
- Severity mapping rules (directly from CLAUDE.md)
- Output format requirements (from CLAUDE.md schema section)
- Domain-specific prioritization (checkout = critical, from CLAUDE.md)

## Evidence of Effect: Severity Assignment

**Observation from actual runs (2026-08-14):**

The system prompt includes the severity mapping from CLAUDE.md:
```
- critical: blocks access entirely for a user group
- major: significantly impairs access
- minor: causes difficulty but workaround exists
- trivial: best-practice improvement with minimal user impact
```

**Result:** In the actual output across 11 violations:
- `image-alt` violations → correctly assigned `"critical"` (blocks blind users entirely)
- `color-contrast` on product price → `"minor"` (readable with effort)
- `color-contrast` on checkout error → `"major"` (blocks form completion feedback)
- `label` violations → `"critical"` (blocks screen reader users from interacting)

The severity assignments follow the CLAUDE.md rules consistently across all 11 generated reports. Without these rules, the LLM would default to axe-core's `impact` field directly (serious/critical/moderate/minor) rather than mapping to business-context severity.

## Evidence of Effect: WCAG Citation Format

**CLAUDE.md rule:** "Always cite the MOST SPECIFIC criterion (e.g., 1.4.3 not just 1.4)"

**Result in actual output:** All successfully parsed bug logs (10/11) use the specific criterion ID format:
- `"wcag_criterion": "1.4.3"` (not "WCAG 1.4.3" or "1.4" or "Contrast")
- `"wcag_criterion": "1.1.1"` (not "Non-text Content" alone)

## Where Context Engineering Did NOT Help

**Fix suggestion specificity:** Despite CLAUDE.md requiring "specific attribute/property to add or change", all 4 color-contrast violations received the same generic suggestion: "Increase the darkness of the text color or lighten the background color to achieve a contrast ratio of at least 4.5:1"

The context artifact can instruct the LLM to be specific, but it cannot give the LLM knowledge it doesn't have (specific passing color values for a given background). This would require adding a contrast-calculation tool rather than more context.

## What CLAUDE.md Does vs. Does Not Do

| Aspect | CLAUDE.md effect | Evidence |
|--------|-----------------|----------|
| Severity mapping | Consistent, business-context severity | All 11 violations correctly mapped |
| Citation format | Consistent "X.Y.Z" format | 10/10 parsed reports use specific IDs |
| Fix specificity (contrast) | No effect — still generic | 4/4 contrast violations have same suggestion |
| Fix specificity (alt text) | Works — specific element referenced | "Add descriptive alt text to all informative images" |
| Domain priority | Checkout violations rated higher | checkout contrast = "major" vs. listing contrast = "minor" |
