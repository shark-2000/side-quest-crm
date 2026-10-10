# Personal research with Databricks Free Edition

This optional integration combines the existing GitHub project with a bounded AI agent in your own Databricks workspace. It is designed for non-commercial personal research and learning. Free Edition does not permit commercial use; calling a sales workflow personal does not remove that restriction.

## What is implemented

- GitHub stores and tests the code. A manual Action starts one existing Databricks job and checks its status. Daily triggering is opt-in.
- Databricks stores the profile, practice briefs, results and decision traces in Delta tables. Its model chooses evidence searches, decides whether to explore a brief, creates a practice draft, reviews it and can revise once.
- The existing public demo and private CRM continue working independently. This release does not copy real CRM records to Databricks or automatically import AI drafts into the CRM.
- No external paid AI key, Databricks App, GPU endpoint, provisioned throughput, vector index or always-on SQL warehouse is required. The notebook invokes an existing workspace chat model. It never creates or upgrades compute.
- Results are viewed in Databricks. They are not uploaded as public GitHub artifacts or committed to Pages.

Code is ready for setup; live model access and authentication must be verified in your workspace before enabling automation. Free Edition is quota-limited, not unlimited. The project cannot guarantee the platform will remain free or available indefinitely.

## Initial setup in Databricks

1. Import `personal_agent.py` as a Python notebook in your workspace. Use serverless compute. The environment needs the Databricks SDK and `requests`; use the provided environment if these are already available.
2. In Serving or AI Playground, identify an **existing chat endpoint available within your Free Edition allocation**. Set the notebook widget `model_endpoint` to its exact name. Do not create a paid endpoint or enable a trial. The code uses the chat-completions-compatible invocation API; not every model supports this format.
3. Set `catalog` to a catalog you can write to (default `workspace`), `schema` to `side_quest_personal`, `max_items` to `1` for the smoke test, and `use_samples` to `true`.
4. Run the notebook once. It creates three small tables and seeds fictional examples only if the profile/brief tables are empty. Read the results table to verify a real model response. On quota or model-access errors the job fails without substituting a fake AI result.
5. Create one job with one notebook task. Set task key `personal_agent`, compute **Serverless**, task retries **0**, job timeout **900 seconds**, maximum concurrent runs **1**, and **no schedule or triggers**. Set notebook parameters above in the job too. Use `max_items=3` after the first successful run. GitHub owns the optional schedule.

The job must be configured in your actual account; the source repository cannot provide a working job ID or credential for you.

## Connect GitHub Actions

In the repository's Settings → Secrets and variables → Actions:

| Setting | Kind | Value |
| --- | --- | --- |
| `DATABRICKS_HOST` | Variable | Your workspace HTTPS origin, without query parameters or email |
| `DATABRICKS_JOB_ID` | Variable | The job's numeric ID |
| `DATABRICKS_TOKEN` | Secret | A workspace API token, if your account supports it |
| `DATABRICKS_PERSONAL_SCHEDULE` | Variable | Leave unset initially; set `true` only after the manual Action succeeds |

Never place credentials in a notebook, browser JavaScript, repository file, workflow input, or chat message. OAuth is Databricks' preferred authentication method; this initial bridge supports a scoped, expiring workspace token if available. If token creation is unavailable, run the notebook manually until a supported OAuth connection is configured. Databricks Apps authentication is not used.

Run **Personal research with Databricks** from Actions. Only status messages appear in GitHub; the workflow does not fetch notebook output or model content. Use the Databricks job UI for detailed errors and results. After successful verification, optional daily triggering is at 03:41 UTC (09:11 India time). Free quotas and GitHub scheduling delays can interrupt runs.

## Use your personal research queue

Start with fictional samples. You can edit the Delta tables privately inside Databricks for non-commercial research. Do not store client secrets or confidential employer data. Databricks' Free Edition comparison page states that it reserves the right to train on your data.

- `profile`: exactly one row with `id='personal'`. `payload` is JSON with `service`, `skills`, and `evidence: [{"id":"project-1","text":"A factual project description"}]`.
- `briefs`: up to 100 short exercises or research briefs. Unique `id`, plus JSON `payload` with `description` and optionally `title`. The agent has no network access tools.
- `results`: one saved analysis per content fingerprint. Fingerprints include the brief, profile, model and prompt version. Changing an input creates a new analysis; unchanged completed analyses are skipped. Work is saved after every completed item. An interrupted item may be recomputed on the next run.

View all results privately:

```sql
SELECT id, status,
       get_json_object(payload, '$.draft.reason') AS reason,
       get_json_object(payload, '$.draft.practice_draft') AS practice_draft,
       get_json_object(payload, '$.review') AS review,
       updated_at
FROM workspace.side_quest_personal.results
ORDER BY updated_at DESC;
```

Use your configured catalog/schema if different. Full decisions and evidence-search results are in `payload.trace`. This implementation uses Delta traces, not an MLflow deployment. A model review is fallible; every draft requires human review. A revised draft is explicitly marked as needing another human review.

## Budget and failure behavior

- Maximum 3 briefs per run, sequential; 5 model requests per brief, 1,000 generated tokens per request. These are application limits, not promised Databricks allowances. Input tokens also count toward usage.
- Up to 2 evidence searches, then a draft, review, and at most 1 revision. Arbitrary tools, shell commands, messages and applications are unavailable.
- Model calls have a 60-second timeout and no automatic HTTP retries. The first failure stops the batch. Completed items remain saved.
- The GitHub bridge checks the job configuration, uses an idempotency key per GitHub run, polls within a fixed budget and requests cancellation on timeout. A manually cancelled Action may leave the job running until its own 15-minute timeout.
- Free Edition compute may stop for the day or month when quotas are exhausted. Resume after reset; don't add retry loops or create extra accounts to evade quotas.

## Validation

```sh
python3 -m unittest discover -s tests -p 'personal_agent_test.py'
node tests/databricks-personal.test.mjs
```

Tests use scripted model responses and mocked HTTP. They verify tool limits, grounding IDs, review status, quota stops, idempotency, credential destination checks and cancellation. They do not prove model quality or a successful live Databricks connection.

Official references, checked 2026-10-10:
- https://docs.databricks.com/aws/en/getting-started/free-edition-limitations
- https://docs.databricks.com/aws/en/getting-started/free-trial-vs-free-edition
- https://docs.databricks.com/aws/en/machine-learning/foundation-model-apis/api-reference
- https://docs.databricks.com/aws/en/dev-tools/auth/pat
- https://docs.databricks.com/api/workspace/jobs/runnow
