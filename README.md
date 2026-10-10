# Side Quest CRM ✦

A freelance workspace for finding opportunities, checking fit, preparing proposals and tracking client conversations.

**[Try the public demo](https://shark-2000.github.io/side-quest-crm/)** · **[Open the private workspace](https://katyayan-cloud-data.bubblymink4.chatgpt.site/crm)**

Four sections keep the workflow simple:

- **Pipeline:** website enquiries, manual leads, stages, next actions and follow-up dates.
- **Find gigs:** paste postings or import AI Job Search JSON, deduplicate, assess fit and shortlist.
- **Proposals:** prepare evidence-based templates, save drafts and build a prompt for an AI review you initiate yourself.
- **My service:** declare skills, real work evidence and search preferences; review recurring skill gaps.

The layout works on phones and desktops.

## Public demo and real workspace

The GitHub Pages demo is an interactive sample with fictional records. Changes stay in browser memory and reset on reload. It sends no lead data to a server. Use “Open private CRM” for real enquiries, persistent edits and owner sign-in.

The private workspace automatically includes enquiries from the portfolio form. Real contacts and notes stay in private R2 storage, never in repository files or Pages artifacts.

## GitHub Actions

`Refresh micro CRM` runs every six hours and supports manual dispatch. If enabled in My service, it also searches the freehire public API for explicit remote contract/freelance/project postings and saves them privately. Provider failures are reported as degraded; they do not invent results or stop manual imports. It requests a short-lived GitHub OIDC identity, calculates pipeline counts and due follow-ups in the runner, then saves a digest to the private backend. No stored GitHub secret is required. Private contact names, emails, messages, notes and evidence are excluded from the runner snapshot and logs. Only search phrases are shared with the discovery provider. It sends no messages to leads.

`Publish Side Quest CRM` rebuilds the sample interface and deploys `docs/` to GitHub Pages.

## Development

Requires Node.js 24. No third-party npm dependencies.

```sh
node scripts/build-crm-pages.mjs
node scripts/build-worker.mjs
node tests/enquiries.test.mjs
node tests/crm.test.mjs
node tests/ecosystem.test.mjs
bash scripts/build.sh
node scripts/validate-artifact.mjs
```

`worker/crm.html` is the shared interface template. `scripts/build-crm-pages.mjs` replaces server API calls with the sample workspace. `worker/crm.js` implements protected lead routes and GitHub OIDC verification. The remaining Worker files retain the portfolio form that supplies enquiries.

## Hosting and forks

Pages hosts the public interface only. The existing Sites Worker provides owner authentication and private R2 persistence. Backend source is included for review and reproducibility; pushing this repo deploys Pages but does not deploy the Worker. The hosting manifest identifies the existing Site and contains no credentials.

Forks can deploy the sample interface independently. To run a real workspace, provision your own backend and storage, set runtime `OWNER_EMAIL`, replace the configured backend URL and update the OIDC trust policy with your exact repository ID, owner ID, branch and workflow path. A fork cannot access the original owner's private data.

## AI Job Search integration

This integrates selected MIT-licensed source and adapts the ranking, constraint and drafter/reviewer patterns from [MadsLorentzen/ai-job-search](https://github.com/MadsLorentzen/ai-job-search). Attribution, pinned commit and license are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The original source is in `vendor/ai-job-search/`. This is a selective integration, not a merge of the entire Git history.

The web app scores with transparent rules and generates proposal templates. It does not run an LLM, install Claude Code or auto-apply. Use Build AI review prompt with your own assistant for a deeper review. The original workflows are reference documents, not installed agent permissions.

For existing upstream search output, paste the results JSON into Find gigs → Import JSON, or convert seen-jobs state locally:

```sh
python tools/import_ai_job_search.py /path/to/private/results.json > /path/to/private/import.json
```

Only records with actual description text are imported. Batches are capped at 20. For larger exports, split the input into batches.

For operation details and limits, read [CRM.md](CRM.md). The micro CRM supports one owner and up to 1,000 listed leads. GitHub schedules can be delayed or paused after prolonged public-repository inactivity.
