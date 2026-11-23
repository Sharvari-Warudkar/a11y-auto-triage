# Specification: L1-A11y-auto-traige-updated (WCAG AA Violation Auto-Triage & Bug Logger)

## Problem Statement

**Domain:** E-commerce — accessibility compliance  
**User:** QA engineers responsible for accessibility testing on e-commerce platforms  
**Problem:** Manual WCAG 2.1 AA audits are slow, inconsistent, and produce bug reports that lack remediation guidance. Engineers run axe-core or Lighthouse, get a list of violations, then spend 30–60 minutes per page translating those violations into actionable Jira tickets with severity, affected user groups, and fix suggestions. Violations recur across sprints because there is no memory of what was already filed.

**Definition of Success:**  
The tool auto-scans a given URL, detects WCAG 2.1 AA violations, retrieves the relevant WCAG success criteria from a local knowledge base, and generates structured bug logs ready for Jira — reducing per-page triage time from ~45 minutes to under 5 minutes, while producing more consistent and informative tickets than manual filing.

## Why This Problem Is Worth Solving

E-commerce sites face legal liability under ADA/Section 508 for inaccessible experiences. A single missed color-contrast failure on a checkout button can block thousands of low-vision users and trigger demand letters. QA teams know this, but accessibility backlogs grow because triage is tedious and the tickets lack enough context for developers to act without asking follow-up questions.

An automated triage pipeline with AI-generated remediation guidance means:
- Developers get tickets they can act on without back-and-forth
- QA engineers cover more pages per sprint
- Recurring violations are caught earlier via deduplication

## Data Provenance

**Source:** Synthetic HTML fixtures simulating common e-commerce page types (product listing, product detail, cart, checkout) with deliberately injected WCAG AA violations. These fixtures are authored by the submitter based on real violation patterns observed in production e-commerce sites.

**What it represents:** Common accessibility failures in e-commerce UIs — missing alt text, insufficient color contrast, missing form labels, non-keyboard-accessible controls, missing ARIA landmarks, incorrect heading hierarchy.

**What it does NOT represent:** Dynamic single-page-app rendering issues, third-party widget violations, mobile-specific touch-target failures, or violations that only appear after user interaction (e.g., error states).

**Known limitations:** The synthetic fixtures are static HTML. Real e-commerce sites use JavaScript rendering, which Playwright handles but introduces timing/loading variability not captured here.

**Sensitive data handling:** No real user data, no production URLs, no proprietary code. All fixtures are original synthetic content.

## Scope

### In Scope
- Automated scanning of URLs using axe-core via Playwright
- RAG retrieval pipeline over WCAG 2.1 success criteria using keyword/TF-IDF matching
- AI-generated bug descriptions (via Groq/Llama 3.3 70B) with severity, affected users, WCAG criterion, and fix suggestion
- Structured JSON output compatible with Jira API
- Deduplication of violations already filed

### Out of Scope
- Production Jira integration (mocked with JSON output)
- Scheduled/recurring scans
- Multi-page crawling
- WCAG AAA criteria
- PDF or native app accessibility

## Architecture Overview

```
[Target URL] → [Playwright + axe-core Scanner] → [Violations JSON]
                                                        ↓
[WCAG 2.1 Docs] → [Keyword Index] → [Local JSON Store]
                                                        ↓
[Violations + Retrieved WCAG Context] → [Groq/Llama 3.3] → [Structured Bug Logs]
                                                        ↓
                                              [JSON Output (Jira-ready)]
```

## Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Scanner | Playwright + @axe-core/playwright | Industry standard, TypeScript native, cross-browser |
| RAG Retrieval | Local keyword/TF-IDF matching | Zero infrastructure needed for 9-document corpus |
| LLM Generation | Groq (Llama 3.3 70B Versatile) | Free tier, fast responses, structured JSON output |
| Language | TypeScript (strict mode) | Type safety, maintainability |
| Deduplication | Local JSON file store | Simple, no external dependencies |

## Competencies Demonstrated

| Dimension | How |
|-----------|-----|
| Spec-Driven Development | This document, committed before code |
| Context Engineering | CLAUDE.md with WCAG rules, project conventions |
| AI Output Review | Review of LLM-generated bug descriptions for accuracy |
| RAG Pipeline | WCAG 2.1 docs → keyword index → local store → retrieve → generate |

## Success Metrics

| Metric | Target |
|--------|--------|
| Violation detection recall vs. axe-core baseline | 100% (we use axe-core directly) |
| Correct WCAG criterion cited in bug log | ≥ 85% of violations |
| Actionable fix suggestion (developer can act without follow-up) | ≥ 75% of violations |
| Per-page triage time | < 5 minutes (vs. ~45 min manual) |
