# Declared Effort Statement

## Approximate Hours: About 15 hours total (including resubmission fixes)

| Phase | Hours | Notes |
|-------|-------|-------|
| Problem definition & scoping | 1.5 | Narrowing from "accessibility testing" to "WCAG AA auto-triage for e-commerce" |
| Data sourcing (fixtures + WCAG docs) | 2 | Writing realistic HTML fixtures with deliberate violations; curating WCAG criteria |
| Spec, plan, tasks writing | 2 | Writing before building — harder than it sounds |
| Implementation (scanner + RAG + generator) | 4 | Majority spent on RAG retrieval tuning and prompt engineering |
| Context engineering (CLAUDE.md + before/after) | 1.5 | Iterating on severity rules and fix suggestion format |
| Testing & failure analysis | 2 | Running against fixtures, documenting what breaks |
| Documentation & pitch | 1.5 | Review write-up, failure analysis, slide |

## What I Cut

1. **Live Jira integration** — would have required a real Jira instance and added 3+ hours for OAuth, field mapping, and error handling. Mocked with JSON output instead.
2. **n8n scheduled workflow** — described in plan but not deployed. The prototype demonstrates the pipeline; scheduling adds infrastructure complexity without demonstrating a new competency.
3. **Multi-page crawling** — would need sitemap parsing, link extraction, and rate limiting. One URL per run is sufficient to demonstrate the pipeline.
4. **WCAG 2.2 criteria** — focused on 2.1 AA only. Adding 2.2 would be ~10 more markdown files but same pipeline logic.
5. **Visual regression / screenshot comparison** — considered adding screenshot diff for layout-based violations but cut for scope.
6. **Production URL testing** — stayed with synthetic fixtures to avoid any data sensitivity issues and ensure reproducibility.

## AI Tools Used

- **Groq (Llama 3.3 70B Versatile)** — bug report generation in the pipeline (Portkey was rejected: org restrictions)
- **Claude Code** — development assistance for scaffolding, documentation, and pipeline logic
- All AI output was reviewed for correctness (see AI_OUTPUT_REVIEW.md)
