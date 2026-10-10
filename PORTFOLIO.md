# Katyayan's freelance portfolio

The portfolio preserves the bold lime/purple/pink design and replaces email links with an enquiry form.

## Publishing on GitHub Pages

In this repository, open **Settings → Pages → Source → GitHub Actions** once. The `Publish portfolio to GitHub Pages` workflow deploys `public/` on changes to `main`. If the first run occurs before Pages is enabled, rerun it from Actions after changing the setting.

Expected address after successful deployment: https://shark-2000.github.io/

## Enquiries

Visitors choose freelance project, hiring opportunity, or just connecting. Required fields: name, reply email, message and contact consent. Company, timeline and budget/salary range are optional.

The frontend posts to `https://katyayan-cloud-data.bubblymink4.chatgpt.site/api/enquiries`. GitHub Pages serves static files, so storage and authorization run in the separate hosted Worker service.

Messages are stored as private JSON records in the service's R2 bucket. A submission returns a reference only after storage succeeds. Repeated submissions with the same request ID are deduplicated. The backend validates fields, checks permitted origins, uses a honeypot and applies a best-effort hourly submission limit. The limit is not atomic and is intended for basic spam control; stronger protection can be added if abuse occurs.

Owner inbox: https://katyayan-cloud-data.bubblymink4.chatgpt.site/inbox

Sign in with the ChatGPT account that owns the deployed Site. Owner authorization uses the trusted Sites identity headers and the runtime `OWNER_EMAIL` setting. Other accounts cannot read enquiries. No visitor messages or credentials belong in this public repository.

## Source

- `public/`: GitHub Pages frontend and downloadable profile copy.
- `worker/handler.js`: backend routes and owner inbox.
- `scripts/build-worker.mjs`: embeds the frontend in the Worker bundle.
- `.openai/hosting.json`: backend hosting configuration with private R2 storage binding.
- `tests/enquiries.test.mjs`: storage, validation, duplicate retries and inbox authorization checks.

The backend is deployed independently through Sites. The GitHub Actions workflow publishes the frontend only; changing backend code here does not automatically deploy the Worker.

## Local checks

```
node tests/enquiries.test.mjs
node scripts/build-worker.mjs
bash scripts/build.sh
node scripts/validate-artifact.mjs
```
