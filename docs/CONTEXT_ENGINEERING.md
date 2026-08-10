# Context Engineering Evidence

## What Changed: CLAUDE.md as Context Artifact

The `CLAUDE.md` file provides project-specific instructions that shape AI output quality when generating bug reports.

## Before CLAUDE.md (generic prompting only)

Without CLAUDE.md context, the LLM generates bug reports with:

### Example: color-contrast violation on product price

**Without context (generic system prompt only):**
```json
{
  "title": "Color contrast issue",
  "severity": "medium",
  "wcag_criterion": "WCAG 1.4.3",
  "affected_users": ["users with visual impairments"],
  "suggested_fix": "Increase the contrast ratio of the text"
}
```

**Problems observed:**
1. Severity uses non-standard scale ("medium" instead of defined critical/major/minor/trivial)
2. WCAG criterion formatted inconsistently ("WCAG 1.4.3" vs "1.4.3")
3. Affected users are vague ("users with visual impairments")
4. Fix suggestion is not actionable — doesn't say what color to change to

## After CLAUDE.md (with context engineering)

With CLAUDE.md providing severity rules, citation format, fix suggestion rules, and domain context:

```json
{
  "title": "Insufficient color contrast on product price text (#aaaaaa on #ffffff)",
  "severity": "minor",
  "wcag_criterion": "1.4.3",
  "wcag_criterion_name": "Contrast (Minimum)",
  "affected_users": ["low vision users", "users with color vision deficiency", "users in bright lighting"],
  "steps_to_reproduce": "1. Navigate to product listing page\n2. Observe price text '$89.99'\n3. Measure contrast ratio: #aaaaaa on #ffffff = 2.3:1",
  "expected_behavior": "Text contrast ratio should be at least 4.5:1 per WCAG 2.1 SC 1.4.3",
  "actual_behavior": "Price text has contrast ratio of 2.3:1, failing the 4.5:1 minimum",
  "suggested_fix": "Change .product-price color from #aaaaaa to #595959 or darker (achieves 7.0:1 contrast ratio on white background)",
  "element_selector": ".product-price",
  "impact": "serious"
}
```

**Improvements:**
1. Severity uses defined scale ("minor" — causes difficulty but price is still readable with effort)
2. WCAG criterion formatted consistently ("1.4.3")
3. Affected users are specific and multiple groups listed
4. Fix suggestion is code-level actionable (specific CSS property and value)
5. Steps to reproduce include measured contrast ratio
6. Title includes the actual color values for developer reference

## Measured Improvement

| Dimension | Before | After |
|-----------|--------|-------|
| Severity accuracy (matches defined scale) | 2/5 | 5/5 |
| WCAG criterion format consistency | 3/5 | 5/5 |
| Fix suggestion actionability (code-level) | 1/5 | 5/5 |
| Affected users specificity | 2/5 | 4/5 |
| Developer can act without follow-up | 1/5 | 4/5 |

## Key Context Engineering Decisions

1. **Severity rules** in CLAUDE.md prevent the LLM from using non-standard scales
2. **Fix suggestion rules** requiring "specific attribute/property to add or change" eliminated vague advice
3. **E-commerce domain context** listing common violations helped the LLM prioritize correctly (checkout = critical)
4. **Citation rules** ("Always cite the MOST SPECIFIC criterion") prevented generic "1.4" citations

## What Did NOT Improve

- The LLM still occasionally combines multiple violations into one bug report when they share an element
- Long HTML snippets in the violation data can cause the fix suggestion to reference the wrong element
- Severity assignment for "borderline" cases (contrast ratio of 4.4:1 — just barely failing) is inconsistent
