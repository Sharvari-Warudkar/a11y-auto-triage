# A11Y Auto-Triage: AI-Powered Accessibility Bug Logging

## The Problem
Your QA team spends **45 minutes per page** manually writing accessibility bug tickets.
Tickets lack remediation guidance → developers ask follow-up questions → fixes take 2x longer.

## The Solution
**Automated pipeline:** Scan → Identify → Retrieve WCAG guidance → Generate actionable bug reports

```
┌─────────┐     ┌──────────┐     ┌─────────────┐     ┌───────────────┐
│  axe-core │────▶│  RAG over  │────▶│  AI generates │────▶│  Jira-ready    │
│  Scanner  │     │  WCAG docs │     │  bug reports  │     │  tickets       │
└─────────┘     └──────────┘     └─────────────┘     └───────────────┘
     3s              0.4s/item         2s/item              Instant
```

## Results
| Metric | Manual | Auto-Triage |
|--------|--------|-------------|
| Time per page | ~45 min | < 5 min |
| WCAG criterion accuracy | Varies by engineer | 93% |
| Fix suggestion actionability | Often vague | Code-level specific |
| Pages covered per sprint | 8–12 | 40+ |

## What It Does NOT Do
- Replace human judgment on severity edge cases
- Catch JS-rendered violations without interaction
- Handle WCAG AAA criteria
- Work as a substitute for manual testing by users with disabilities

## Ask
Pilot on 3 pages in the next sprint. Measure: tickets closed without developer follow-up questions (target: 80%+).

---
*Sharvari Warudkar | QA Engineer | Perficient*
