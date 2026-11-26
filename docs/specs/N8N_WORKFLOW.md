# Spec: n8n scheduled triage workflow

Status: written BEFORE the workflow is built (see git history).

## Problem

The pipeline only runs when someone types a command. The original plan called for scheduled scans, but the workflow was cut and the folder `n8n/` has been empty. QA needs recurring scans whose results are summarised and routed, without a person remembering to run them.

## Requirements

- R1. A workflow with a **Schedule Trigger** (weekdays 07:00) and a **Manual Trigger** (for testing and the CLI run).
- R2. It scans a configurable list of targets by calling the existing pipeline CLI (`src/pipeline.ts`). No scanning or generation logic is duplicated in n8n.
- R3. One failing target must not stop the others (per-item error isolation).
- R4. Deduplication stays on by default, so a repeat run reports only new violations.
- R5. A Jira-shaped summary is produced from each run's result file by a project script (`scripts/triage-summary.js`), so the transformation is unit-testable outside n8n. No live Jira call (still out of scope; the payload is mocked).
- R6. Routing: if a run has at least one critical bug, build an alert message (mock: text in the execution output); otherwise end quietly.

## Acceptance criteria

- A1. `n8n import:workflow` accepts `n8n/workflow.json`.
- A2. The workflow is executed end to end with the n8n CLI on at least two fixture targets and finishes with exit code 0; the run log is committed (`evidence/n8n/`).
- A3. Running it a second time shows deduplication working (zero new bug logs for the same targets).
- A4. `scripts/triage-summary.js` has unit tests, and `npm test` still passes.
- A5. Docs state the limits plainly: executed locally with the CLI, not deployed on a server and not left scheduled; alert is mocked; no live Jira; the shell command uses Windows `cmd` syntax.

## Out of scope

Live Jira, email/Slack delivery, multi-page crawling, a hosted n8n instance, credentials management.

## Tasks

- [x] T10.1 `scripts/triage-summary.js` + unit tests
- [x] T10.2 `n8n/workflow.json` and `n8n/README.md`
- [x] T10.3 Install n8n outside the repo; import and execute the workflow twice; commit the logs
- [x] T10.4 Update docs (SPEC scope, EFFORT, CLAUDE.md, TRACEABILITY, README), Word summary and PowerPoint
