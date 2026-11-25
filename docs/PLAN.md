# Plan: L1-A11y-auto-traige-updated (WCAG AA Violation Auto-Triage & Bug Logger)

## Approach

Build a TypeScript pipeline with three stages: scan, enrich (RAG), and log. Each stage is independently testable. Use local keyword matching for retrieval (sufficient for a 9-document corpus) and Groq's free API for LLM generation.

## Technology Choices

| Component | Choice | Why (and rejected alternative) |
|-----------|--------|-------------------------------|
| Scanner | Playwright + @axe-core/playwright | Cross-browser support, TypeScript native; rejected Puppeteer (deprecated warnings, less maintained) |
| RAG Retrieval | Keyword/TF-IDF matching | Zero infrastructure, instant retrieval for small corpus; rejected vector embeddings (API cost/complexity overkill for 9 docs) |
| LLM | Groq (Llama 3.3 70B) | Free tier with 30 req/min, fast; rejected Gemini (quota issues), rejected Portkey (org restrictions on virtual keys) |
| Output | Structured JSON (Jira-compatible) | Can POST to Jira API or export as CSV; rejected direct Jira integration (requires live instance) |
| Language | TypeScript (strict mode) | Type safety, better maintainability than plain JS |

## RAG Pipeline Design

### Documents
- WCAG 2.1 Success Criteria (Level A and AA only) — 9 curated criteria covering the most common e-commerce violations

### Retrieval Strategy
- Keyword/TF-IDF frequency matching (cosine similarity on word frequency vectors)
- One document per success criterion (with requirements, techniques, and remediation)
- Query: violation ID + help text + description from axe-core
- Top-k: 3 documents per violation

### Generation
- System prompt: QA engineer persona, structured output format, severity mapping rules
- User prompt: violation details + retrieved WCAG context
- Output: JSON with fields: title, severity, wcag_criterion, affected_users, steps_to_reproduce, suggested_fix, element_selector

## Pipeline Flow

```
1. INPUT: URL or local HTML file to scan
2. SCAN: Launch Playwright → inject axe-core → collect violations
3. DEDUPLICATE: Compare against previously filed violations (by rule ID + selector)
4. RETRIEVE: For each new violation, keyword-match against WCAG docs (top-3)
5. GENERATE: Send violation + WCAG context to Groq → parse structured JSON
6. OUTPUT: Array of structured bug logs → JSON file
```

## File Structure

```
a11y-auto-triage/
├── docs/
│   ├── SPEC.md
│   ├── PLAN.md
│   └── TASKS.md
├── src/
│   ├── scan.ts           — Playwright + axe-core scanner
│   ├── rag/
│   │   ├── ingest.ts     — load WCAG docs into store
│   │   ├── store.ts      — keyword store (read/write/search)
│   │   ├── retrieve.ts   — query interface
│   │   └── embeddings.ts — keyword/TF-IDF similarity functions
│   ├── generate.ts       — Groq LLM bug-log generation
│   ├── deduplicate.ts    — check against filed history
│   ├── pipeline.ts       — orchestrator
│   └── types.ts          — TypeScript interfaces
├── data/
│   └── wcag/             — WCAG criteria (markdown files)
├── fixtures/
│   ├── product-listing.html
│   ├── product-detail.html
│   ├── cart.html
│   └── checkout.html
├── config/
│   └── sites.json        — configurable target sites
├── tests/                — test suite
├── results/              — scan output (gitignored)
├── CLAUDE.md             — context engineering artifact
├── package.json
├── tsconfig.json
└── .env.example
```

## What I Cut (declared tradeoffs)

- No live Jira integration (mocked with JSON output)
- No n8n scheduled workflow
- No multi-page crawling (single URL per run; scan-all for batch)
- No WCAG AAA (AA only, matching scope)
- No vector embeddings (keyword matching sufficient for 9 docs)
- No Portkey gateway (org restrictions prevented setup; using Groq directly)
- Model note: the 2026-08-14 results used llama-3.3-70b-versatile, since retired on this Groq account (404). The model is configurable via `GROQ_MODEL` (default unchanged); the 2026-11-25 re-run used openai/gpt-oss-120b (see evidence/rerun/RERUN.md)
