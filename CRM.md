# Side Quest Micro CRM

Public demo: https://shark-2000.github.io/side-quest-crm/

Private workspace: https://katyayan-cloud-data.bubblymink4.chatgpt.site/crm. Sign in with the ChatGPT account that owns the portfolio Site.

The Pages demo uses fictional records in browser memory. Adding leads or editing stages there sends no requests and persists nothing. Reload to reset. The button opens the private workspace for real enquiries and persistent edits.

## What it does

- Reads website enquiries automatically, without waiting for a scheduled run.
- Adds manually sourced leads from Upwork, LinkedIn, agencies and referrals.
- Tracks New, Contacted, Proposal, Won and Closed/lost stages.
- Stores notes, estimated value and a follow-up date for each lead.
- Searches leads and filters due follow-ups, website enquiries and manual leads.
- Rejects stale edits instead of overwriting a newer update.

## What runs in GitHub Actions

`.github/workflows/crm-sync.yml` runs every six hours at minute 17 UTC, on manual dispatch, and after changes to the workflow or its runner script. The runner requests a short-lived GitHub OIDC token, reads only lead IDs/stages/follow-up dates, calculates the due list and pipeline counts, and saves the digest. It never logs names, emails, messages, notes, or identity tokens. This job sends no emails or messages to contacts.

Run it manually from Actions → Refresh micro CRM → Run workflow. The CRM shows the last successful digest time.

GitHub Actions is the scheduled processing engine. It does not host a continuously running web server. The CRM screen, authentication and persistent records use the existing portfolio Worker and private R2 bucket. GitHub Pages serves the interactive public demo. No enquiry records are committed to the public repository.

The backend trusts only GitHub-signed tokens with the correct audience, repository and owner IDs, main branch, permitted trigger and the exact CRM workflow path. No long-lived secret needs to be installed in GitHub.

## Limits

The micro CRM lists up to 1,000 leads and displays a warning at that limit. It has one owner, no outbound messaging, and no automatic follow-up sending. Values are free text and are not summed across currencies. Scheduling can be delayed by GitHub; public repository schedules can be disabled after 60 days without repository activity. The CRM still works interactively if the scheduled job stops.

Backend changes are deployed through Sites separately from the public Pages workflow. If the repository or workflow path is renamed, update the backend OIDC trust policy before rerunning automation.

## Local verification

```
node scripts/build-worker.mjs
node tests/enquiries.test.mjs
node tests/crm.test.mjs
bash scripts/build.sh
node scripts/validate-artifact.mjs
```

The tests cover enquiry persistence, validation, owner authorization, edit conflicts, CSRF, valid and forged signatures, repository/branch/audience restrictions and digest storage. Visual browser QA was unavailable in the authoring environment.
