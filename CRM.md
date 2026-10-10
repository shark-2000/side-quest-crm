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

## Freelance ecosystem

Resume intake is under My service. Paste plain text or load a TXT file, select your offer, extract suggestions locally, and verify every detected skill and evidence line. PDF/DOCX binary parsing is not implemented; copy text from those files. Keyword mentions are not proficiency or verified experience. The raw input stays in browser memory and is not saved or sent to a provider. Only reviewed profile fields are saved privately.

Search phrases can be suggested from service and skills, edited and saved. Save profile & find gigs calls the owner-protected POST /api/crm/opportunities/search endpoint immediately. The backend uses only saved search phrases, requires the current profile version and same-site origin, and limits manual attempts to once per two minutes. Results are deduplicated and scored through the existing pipeline. Provider outages are shown as degraded, with no invented matches. Scheduled discovery must be explicitly enabled separately; the CRM GitHub Action exposes all/gigs/followups commands. An immediate search runs through the private backend, not a secret-bearing browser dispatch to GitHub.

Open My service first and save a focused service, deliverable skills, working languages and real evidence. New real profiles begin blank; the public demo profile is fictional. Find gigs supports posting-text intake and up to 20 JSON records per import. The backend normalizes HTTPS URLs, skips duplicates and lists up to 1,000 opportunities. Upstream scraper records without descriptions are skipped by the local conversion utility.

Scores use four transparent dimensions with weights adapted from AI Job Search: technical 30%, evidence overlap 25%, delivery location 15%, service alignment 30%. Unknown requirements and unknown working locations receive low provisional scores. Scores are not AI conclusions. Deadline, remote-only and declared-language conflicts are visible gates; geographic eligibility remains a manual verification.

Prepare proposal template uses only saved service and evidence. Add scope, price, timeline and proof links yourself. Build AI review prompt creates a local prompt for you to copy to your assistant. The app sends no proposals, messages or AI requests. Save edits before Move to pipeline; conversion keeps one linked lead even when retried. Lead follow-ups remain under Pipeline.

Scheduled discovery is off initially. Turn it on in My service after reviewing up to three search phrases. The runner sends those phrases to freehire.me, filters for explicit remote contract/freelance/project postings, and posts results to the protected backend through the existing GitHub identity. It does not scrape signed-in Upwork or LinkedIn. The provider can return no suitable postings or be unavailable; status is shown beside Find gigs.

See THIRD_PARTY_NOTICES.md and playbooks/freelance-workflow.md for upstream attribution and a full weekly workflow.
