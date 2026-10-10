# Optional Firecrawl discovery

Firecrawl is an opt-in GitHub Actions source. The private **Find gigs now** button continues using freehire. Firecrawl results enter the same private opportunity store through the existing signed GitHub identity and are scored against your profile. No resume, evidence or contact details are sent to Firecrawl; only the first saved search phrase is sent.

## Enable a manual search

1. Create a Firecrawl account on its free plan and obtain an API key. Do not enable paid top-ups if you want to stay within the free allocation.
2. In this GitHub repository, open Settings → Secrets and variables → Actions and add the repository secret `FIRECRAWL_API_KEY`. Never put the key into the profile form, repository, workflow inputs or chat.
3. Save your service, skills and search phrases in the private CRM. Scheduled discovery must be **On** so the runner is authorized to collect gigs.
4. Open **Refresh micro CRM** in Actions → Run workflow. Choose command **gigs** and check **firecrawl**.
5. Open Find gigs in the private CRM after the run. Results have source `other`, an original posting link and a description beginning `Discovery: Firecrawl public web search`. Location, age, client identity and eligibility remain unverified until you review them.

## Optional unattended searches

Add repository variable `FIRECRAWL_ENABLED=true` after a successful manual run. Firecrawl runs in the first scheduled refresh before 06:00 UTC, normally the 00:17 UTC refresh. Other six-hour refreshes use freehire only. Push events never request Firecrawl. Manual runs consume additional credits; this is a request limit, not a guaranteed monthly spending cap. Keep the account on its free plan.

Each invocation performs one `/v2/search` request, at most five web results, with main-content Markdown scraping and a basic proxy. It has a 60-second timeout and no retries, login automation, CAPTCHA solving, link traversal or agent browser actions. Allowed result hosts are We Work Remotely, Lever, Greenhouse and freelancermap. Only pages with substantial content and explicit contract/freelance/project wording are kept; this heuristic can produce false positives. Search snippets alone, blocked pages and obvious full-time titles are discarded. Publication dates and working location are not guessed.

Search and scraping consume Firecrawl credits. Account allowances and pricing can change; inspect your account's allocation before enabling. HTTP 402/429 and provider errors produce a sanitized workflow warning and retain any freehire results. No provider error body or API key is logged. No paid endpoint or subscription is created by this project. Live Firecrawl access is not verified until a key is configured and a manual run succeeds.

Tests: `node tests/firecrawl.test.mjs`.

Official references checked 2026-10-10:
- https://docs.firecrawl.dev/api-reference/endpoint/search
- https://docs.firecrawl.dev/features/search
- https://docs.firecrawl.dev/billing
