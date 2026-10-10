# Third-party source and adaptations

Side Quest CRM incorporates selected source and workflow references from **AI Job Search** by Mads Lorentzen:

- Source: https://github.com/MadsLorentzen/ai-job-search
- Pinned commit: `a011214d60f943770e33f7d5f070e1a5f91e3822`
- License: MIT, copyright (c) 2026 Mads Lorentzen
- Complete notice: [vendor/ai-job-search/LICENSE](vendor/ai-job-search/LICENSE)

Unmodified copies are in `vendor/ai-job-search/`: the canonical job-key utility, freehire search/normalization code, and evaluation/ranking/application reference workflows. Upstream agent instructions are retained as reference documents, not installed as agent permissions or executed automatically.

`tools/import_ai_job_search.py` uses the upstream key function to deduplicate imported search output. `scripts/opportunity-scout.mjs` adapts the public freehire API contract and HTML cleanup to the existing Node.js Actions runner. `worker/ecosystem-core.js` adapts the weighted-fit, constraint-gate and draft-review ideas for freelance projects, with explicit rules rather than LLM inference.

This is a selective integration, not a full Git-history merge or installation of Claude Code. Upstream CV templates, candidate profiles, credentials, Danish job-board scrapers and personal documents are not included. The original license applies to the copied and derived portions. No affiliation or endorsement is implied.
