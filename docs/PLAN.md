# Plan: WCAG AA Violation Auto-Triage & Bug Logger

## Approach

Build a Node.js pipeline with three stages: scan, enrich (RAG), and log. Each stage is independently testable. Use local vector storage (in-memory with flat JSON persistence) to keep the project self-contained — no external database required.

## Technology Choices

| Component | Choice | Why (and rejected alternative) |
|-----------|--------|-------------------------------|
| Scanner | axe-core + Puppeteer | Industry standard; rejected pa11y (less granular violation data) |
| Embedding | Portkey → OpenAI text-embedding-3-small | Cost-effective, sufficient for short WCAG passages; rejected local embeddings (setup complexity for demo) |
| Vector Store | In-memory with JSON persistence | Zero infrastructure; rejected ChromaDB (overkill for ~200 WCAG chunks) |
| LLM | Claude via Portkey gateway | Strong instruction-following for structured output; rejected GPT-4o (comparable but Portkey routing makes switching trivial) |
| Output | Structured JSON (Jira-compatible) | Can POST to Jira API or export as CSV; rejected direct Jira integration (requires live instance) |

## RAG Pipeline Design

### Documents
- WCAG 2.1 Success Criteria (Level A and AA only) — ~50 criteria
- WCAG Sufficient Techniques (G, H, ARIA series) — ~150 techniques
- Common failure patterns (F series) — ~50 patterns

### Chunking Strategy
- One chunk per success criterion (with its understanding notes)
- One chunk per technique (title + description + code example)
- Average chunk size: ~300–500 tokens
- Total corpus: ~250 chunks

### Retrieval
- Query: violation ID + element context from axe-core
- Top-k: 3 chunks per violation
- Similarity: cosine distance on embeddings

### Generation
- System prompt: QA engineer persona, structured output format
- User prompt: violation details + retrieved WCAG context
- Output: JSON with fields: title, severity, wcag_criterion, affected_users, steps_to_reproduce, suggested_fix, element_selector

## Pipeline Flow

```
1. INPUT: URL to scan
2. SCAN: Launch Puppeteer → inject axe-core → collect violations
3. DEDUPLICATE: Compare against previously filed violations (by rule ID + selector)
4. ENRICH: For each new violation:
   a. Build query from violation rule ID and element context
   b. Retrieve top-3 WCAG chunks from vector store
   c. Send to LLM with structured output prompt
   d. Parse and validate response
5. OUTPUT: Array of structured bug logs → JSON file + optional Jira POST
```

## File Structure

```
a11y-auto-triage/
├── docs/
│   ├── SPEC.md
│   ├── PLAN.md
│   └── TASKS.md
├── src/
│   ├── scan.js          — axe-core scanner
│   ├── rag/
│   │   ├── ingest.js    — chunk & embed WCAG docs
│   │   ├── store.js     — vector store (read/write/search)
│   │   └── retrieve.js  — query interface
│   ├── generate.js      — LLM bug-log generation
│   ├── deduplicate.js   — check against filed history
│   └── pipeline.js      — orchestrator
├── data/
│   └── wcag/            — WCAG criteria and techniques (markdown)
├── fixtures/
│   ├── product-listing.html
│   ├── product-detail.html
│   ├── cart.html
│   └── checkout.html
├── results/             — scan output (gitignored)
├── CLAUDE.md            — context engineering artifact
├── package.json
└── .env.example
```

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| axe-core misses JS-rendered content | Use Puppeteer with waitUntil: 'networkidle0' |
| LLM hallucinates WCAG criteria | Validate cited criterion exists in our corpus |
| Embeddings drift for similar violations | Include violation rule ID as exact-match pre-filter |
| Portkey rate limits | Batch violations, process sequentially with 500ms delay |

## What I Am Cutting (declared tradeoffs)

- No live Jira integration (mocked with JSON output)
- No n8n scheduled workflow (described but not deployed)
- No multi-page crawling (single URL per run)
- No WCAG AAA (AA only, matching scope)
- No CI/CD integration (manual run only)
