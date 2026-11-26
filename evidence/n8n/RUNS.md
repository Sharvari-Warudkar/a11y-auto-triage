# n8n workflow runs (2026-11-26)

Workflow: `n8n/workflow.json` (12 nodes). Spec and acceptance criteria: `docs/specs/N8N_WORKFLOW.md` (committed before the workflow was built). Executed locally with the n8n 2.49.7 CLI from a throwaway install and a throwaway n8n home folder; model `openai/gpt-oss-120b` (Llama 3.3 70B is retired). Raw logs: `run1.log`, `run2.log`. Result files created by run 1: `results/`.

## Acceptance criteria

| Criterion | Result |
|---|---|
| A1 `n8n import:workflow` accepts the file | Met: "Successfully imported 1 workflow." |
| A2 executed end to end on at least two targets, exit code 0 | Met: run 1, status `success`, exit code 0, two targets |
| A3 second run shows deduplication | Met: run 2 reported 0 new bug logs for both targets |
| A4 unit tests for the summary script, `npm test` passes | Met: 4 tests in `tests/triage-summary.test.ts`, 35 tests total |
| A5 limits stated | Met: see below and `n8n/README.md` |

## Run 1 (empty dedup history)

| Target | Exit | New bug logs | Route |
|---|---|---|---|
| fixtures/holdout/checkout-payment.html | 0 | 4 (all critical) | Critical bugs, then Build alert (mock): "A11Y ALERT: 4 critical accessibility bug(s)", 4 Jira issues to create |
| fixtures/holdout/home.html | 0 | 5 (all major) | No critical: end |

Both branches of the routing were exercised in a single run. Total time about 2 minutes (dominated by LLM calls).

## Run 2 (same targets, history kept)

Both targets: 0 new bug logs, "nothing new (all violations already filed)", routed to "Nothing new or failed: end". No new result files were written.

## Limits

- Executed with the CLI on one machine; the workflow was not deployed on a server and was not left running on its schedule. The Schedule Trigger (weekdays 07:00) is configured but was never fired by the clock; the Manual Trigger started the runs.
- The alert and the Jira payload are mocked; nothing was sent anywhere.
- Per-target failure isolation (`onError: continueRegularOutput`) is configured but was not exercised: no target failed in these runs.
- Execute Command is disabled by default in n8n 2.x; the runs set `NODES_EXCLUDE='[]'`.
- Shell commands use Windows `cmd` syntax (`cd /d`).
- The model alone rated some checkout bugs lower; checkout bugs are critical because of the code rule in `src/generate.ts` (see docs/CONTEXT_ENGINEERING.md), which is why the checkout page triggers the alert.
