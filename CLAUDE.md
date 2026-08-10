# CLAUDE.md — A11Y Auto-Triage Context

## Project Purpose
WCAG 2.1 AA violation auto-triage tool for e-commerce QA. Scans pages with axe-core, retrieves relevant WCAG criteria via RAG, and generates structured bug reports ready for Jira.

## Architecture
- Scanner: axe-core + Playwright (src/scan.ts)
- RAG: embed WCAG docs → local vector store → cosine similarity retrieval
- Generator: LLM via Portkey gateway → structured JSON bug logs
- Pipeline: src/pipeline.ts orchestrates scan → dedup → retrieve → generate → output

## Code Conventions
- TypeScript with strict mode
- Playwright for browser automation (not Puppeteer)
- Async/await for all async operations
- Types defined in src/types.ts
- Results go to results/ (gitignored)
- WCAG data in data/wcag/ as markdown files

## Bug Report Output Schema
Every generated bug log MUST include:
- title (max 80 chars, descriptive)
- severity: critical/major/minor/trivial
- wcag_criterion: specific SC ID (e.g., "1.4.3")
- affected_users: array of user groups
- suggested_fix: specific, code-level remediation

## Severity Rules
- critical: blocks entire user group from completing a task
- major: significant impairment, no easy workaround
- minor: causes difficulty, workaround exists
- trivial: best-practice, minimal impact

## WCAG Criterion Citation Rules
- Always cite the MOST SPECIFIC criterion (e.g., 1.4.3 not just 1.4)
- If multiple criteria apply, cite the primary one and mention others
- Never invent criteria IDs — only use ones from data/wcag/

## Fix Suggestion Rules
- Must be actionable code changes (not "improve contrast")
- Include specific attribute/property to add or change
- Reference the element selector from the violation
- Example: "Add alt='Red running shoe, side view' to img[src='shoe-red.jpg']"

## E-commerce Domain Context
- Common violation patterns: missing alt on product images, low contrast on prices/stock status, unlabeled form fields in checkout, non-keyboard-accessible add-to-cart
- Affected pages: product listing, product detail, cart, checkout
- Priority: checkout flow violations are always critical (blocks purchase)
- Users: blind (screen readers), low vision (magnification), motor impairment (keyboard-only)
