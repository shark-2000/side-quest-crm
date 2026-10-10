# Side Quest CRM ✦

A small freelance pipeline for turning enquiries into your next project.

**[Try the public demo](https://shark-2000.github.io/side-quest-crm/)** · **[Open the private workspace](https://katyayan-cloud-data.bubblymink4.chatgpt.site/crm)**

Track New → Contacted → Proposal → Won / Closed. Add opportunities, save next actions, set follow-up dates and search your pipeline. The layout works on phones and desktops.

## Public demo and real workspace

The GitHub Pages demo is an interactive sample with fictional records. Changes stay in browser memory and reset on reload. It sends no lead data to a server. Use “Open private CRM” for real enquiries, persistent edits and owner sign-in.

The private workspace automatically includes enquiries from the portfolio form. Real contacts and notes stay in private R2 storage, never in repository files or Pages artifacts.

## GitHub Actions

`Refresh micro CRM` runs every six hours and supports manual dispatch. It requests a short-lived GitHub OIDC identity, calculates pipeline counts and due follow-ups in the runner, then saves a digest to the private backend. No stored GitHub secret is required. Names, emails, messages and notes are excluded from the runner snapshot and logs. It sends no messages to leads.

`Publish Side Quest CRM` rebuilds the sample interface and deploys `docs/` to GitHub Pages.

## Development

Requires Node.js 24. No third-party npm dependencies.

```sh
node scripts/build-crm-pages.mjs
node scripts/build-worker.mjs
node tests/enquiries.test.mjs
node tests/crm.test.mjs
bash scripts/build.sh
node scripts/validate-artifact.mjs
```

`worker/crm.html` is the shared interface template. `scripts/build-crm-pages.mjs` replaces server API calls with the sample workspace. `worker/crm.js` implements protected lead routes and GitHub OIDC verification. The remaining Worker files retain the portfolio form that supplies enquiries.

## Hosting and forks

Pages hosts the public interface only. The existing Sites Worker provides owner authentication and private R2 persistence. Backend source is included for review and reproducibility; pushing this repo deploys Pages but does not deploy the Worker. The hosting manifest identifies the existing Site and contains no credentials.

Forks can deploy the sample interface independently. To run a real workspace, provision your own backend and storage, set runtime `OWNER_EMAIL`, replace the configured backend URL and update the OIDC trust policy with your exact repository ID, owner ID, branch and workflow path. A fork cannot access the original owner's private data.

For operation details and limits, read [CRM.md](CRM.md). The micro CRM supports one owner and up to 1,000 listed leads. GitHub schedules can be delayed or paused after prolonged public-repository inactivity.
