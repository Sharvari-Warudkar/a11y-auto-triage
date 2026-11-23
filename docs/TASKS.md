# Tasks: L1-A11y-auto-traige-updated (WCAG AA Violation Auto-Triage & Bug Logger)

## Phase 1: Data & Fixtures

- [x] T1.1 — Create 4 synthetic HTML fixtures (product-listing, product-detail, cart, checkout) each containing 3–5 deliberate WCAG AA violations
- [x] T1.2 — Prepare WCAG 2.1 AA success criteria as markdown chunks (one file per criterion)
- [x] T1.3 — Prepare WCAG sufficient techniques as markdown chunks (key G/H/ARIA/F series)

## Phase 2: Scanner

- [x] T2.1 — Implement axe-core + Playwright scanner (input: URL, output: violations JSON)
- [x] T2.2 — Test scanner against fixtures, verify all injected violations detected

## Phase 3: RAG Pipeline

- [x] T3.1 — Implement chunker/ingest script to index WCAG markdown files (keyword/TF-IDF)
- [x] T3.2 — Implement local JSON store (cosine similarity over TF-IDF keyword maps; no vector embeddings)
- [x] T3.3 — Implement retrieval interface (query by violation → top-3 WCAG chunks)
- [x] T3.4 — Test retrieval: verify correct criteria returned for known violations

## Phase 4: Bug Log Generation

- [x] T4.1 — Implement LLM generation module (violation + WCAG context → structured bug log)
- [x] T4.2 — Define and validate output schema (title, severity, criterion, affected_users, fix)
- [x] T4.3 — Implement deduplication against filed-violations history

## Phase 5: Pipeline Orchestration

- [x] T5.1 — Wire scan → deduplicate → retrieve → generate → output pipeline
- [x] T5.2 — End-to-end run on fixtures; 16 Playwright tests (tests/) cover scan, RAG and dedup

## Phase 6: Context Engineering & Review

- [x] T6.1 — Write CLAUDE.md with project-specific instructions
- [ ] T6.2 — Run pipeline WITHOUT CLAUDE.md context (NOT DONE: no controlled before/after run exists; docs/CONTEXT_ENGINEERING.md reports only observed effects of CLAUDE.md on the 11 real reports)
- [x] T6.3 — Run pipeline WITH CLAUDE.md context (results/bugs-*.json, 2026-08-14)
- [x] T6.4 — Document observed CLAUDE.md effects in docs/CONTEXT_ENGINEERING.md

## Phase 7: Documentation & Submission

- [x] T7.1 — Write AI output review (intent, tests, security, performance, maintainability)
- [x] T7.2 — Write failure analysis (specific inputs that break the prototype)
- [x] T7.3 — Record measured results (9/11 = 82% correct citation (target 85% not met), recounted from results/*.json)
- [x] T7.4 — Create one-slide pitch for client stakeholders
- [x] T7.5 — Write declared-effort statement
