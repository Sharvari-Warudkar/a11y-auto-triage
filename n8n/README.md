# n8n workflow: scheduled accessibility triage

Spec: `docs/specs/N8N_WORKFLOW.md` (committed before this workflow was built). Workflow file: `n8n/workflow.json`.

## What it does

```
Schedule Trigger (weekdays 07:00)  --\
                                      >-- Targets --> Run pipeline --> Parse run --> Has result file?
Manual Trigger (testing / CLI)      --/                                              |yes            |no
                                                                              Summarise result    Nothing new or failed: end
                                                                                   |
                                                                              Parse summary --> Critical bugs?
                                                                                                 |yes              |no
                                                                                          Build alert (mock)   No critical: end
```

- **Targets** (Code node): edit the project folder and the list of pages to scan.
- **Run pipeline** (Execute Command): calls `npx ts-node src/pipeline.ts <target>`. Dedup is on, so a repeat run reports only new violations. A failing target does not stop the others (`onError: continueRegularOutput`).
- **Summarise result**: `node scripts/triage-summary.js <result file>` builds a Jira-shaped payload (unit-tested in `tests/triage-summary.test.ts`).
- **Critical bugs?**: routes to a mock alert message or ends quietly.

## Run it

Needs Node 24+ (n8n requirement), the project's `.env` with `GROQ_API_KEY`, and n8n installed (not a project dependency):

```bash
npm install --prefix ../n8n-local n8n          # any folder outside the repo
n8n import:workflow --input=n8n/workflow.json
NODES_EXCLUDE='[]' n8n execute --id=a11yAutoTriage01     # Execute Command is disabled by default in n8n 2.x
```

To run it on the schedule, start n8n (`n8n start`), open the workflow and activate it.

## Limits (stated plainly)

- It was executed locally with the n8n CLI (evidence in `evidence/n8n/`). It is not deployed on a server and was not left running on its schedule.
- The alert and the Jira payload are mocked: nothing is sent anywhere.
- The shell commands use Windows `cmd` syntax (`cd /d`); on Linux or macOS change them to `cd`.
- `Execute Command` is disabled by default in n8n 2.x for security; running the workflow requires enabling it (`NODES_EXCLUDE='[]'`) on a machine you trust.
