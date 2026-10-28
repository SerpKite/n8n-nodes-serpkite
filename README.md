# n8n-nodes-serpkite

Use [SerpKite](https://serpkite.com) in n8n workflows and AI agents: search Google and its verticals, look up places and reviews, read, extract, map and crawl websites, get cited AI answers and research reports, and ask AI assistants such as ChatGPT and Gemini.

## Installation

In self-hosted n8n, go to **Settings → Community nodes → Install** and enter `n8n-nodes-serpkite`. See [n8n's community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

[The package is published on npm](https://www.npmjs.com/package/n8n-nodes-serpkite) with GitHub Actions provenance. n8n Creator Portal verification is a separate review; the package is not yet verified.

## Credentials

Create an account at [app.serpkite.com](https://app.serpkite.com), create an API key, and paste the complete `skt_live_...` secret into a **SerpKite API** credential. n8n stores the credential and adds its Bearer header; the key is never placed in a query string. The credential test calls `/v1/account` and does not perform a paid search.

## Operations

Pick a **Resource**, then an **Operation**. Each operation's options are exactly the parameters the API accepts for it.

| Resource | Operation | What it returns |
| --- | --- | --- |
| Search | Web Search | Google results: organic results, answer box, knowledge graph, people also ask and more; optionally the top pages as Markdown and a cited AI answer |
| Search | News Search | Google News results, optionally with a cited AI answer |
| Search | Image Search, Video Search, Shopping Search | Google Images, Videos and Shopping results |
| Search | Scholar Search, Patent Search | Google Scholar papers and Google Patents results |
| Search | Autocomplete | Google autocomplete suggestions |
| Place | Maps Search, Local Search | Places with address, coordinates, rating, hours and identifiers |
| Place | Get Place | The full listing of one place (by place ID, CID, feature ID or Yandex organisation ID) |
| Place | Get Reviews | Reviews of a place, with paging |
| Web | Fetch Webpage | A public HTML page or PDF as clean Markdown with metadata |
| Web | Extract Pages | Up to 20 URLs as Markdown, text or HTML, with query-ranked highlights, an AI summary or JSON extracted with a schema |
| Web | Map Site | A site's URLs from its sitemaps and links, optionally ranked by a search |
| Web | Start Crawl, Get Crawl | A whole site or section as Markdown pages (asynchronous; see below) |
| AI Research | Answer | A short answer grounded on live Google results, citing them; optionally JSON for a schema |
| AI Research | Start Research, Get Research | A multi-step research task with a cited Markdown report (asynchronous; see below) |
| AI Assistant | Ask ChatGPT, Ask Gemini, Ask Copilot, Ask AI Mode, Ask Brave AI | The assistant's answer with its cited sources, products and places, and optional brand or domain mentions (Track) |
| Account | Get | Credit balance, limits and this month's usage (free) |

Search options include country, language, location, number of results, page, time window or date range, domain filters, SafeSearch and engine (Google by default; Auto falls back to other search engines when Google is unavailable). **Response Format** can be JSON (default), Compact (smaller, for AI agents) or Markdown (returned in a `markdown` field).

**Asynchronous tasks.** Start Crawl and Start Research return the task right away (with its `id`) unless **Wait for Completion** is on: the node then polls until the task ends or **Max Wait** passes (default 300 s, up to 1800 s) and returns the task as it stands. Get Crawl and Get Research fetch a task by ID (kept for 24 hours) and can wait the same way. Tasks can also report to a webhook.

**Timeouts.** AI assistant answers can take up to about 90 seconds and Answer up to about 100, so those requests wait up to 120 seconds; Extract Pages waits for its page timeout plus 15 seconds; other requests wait 60 seconds.

**Billing.** Every operation except Account is billed in credits per the [pricing page](https://serpkite.com/pricing). Failed and empty requests are not billed, and the unused part of a crawl or research reservation is refunded.

Each input item produces one complete response envelope including `meta`. Use n8n's **Split Out** node on `results` to process search hits individually. Item pairing preserves expressions that refer to earlier nodes. Errors stop the workflow by default; n8n's continue-on-error setting produces a paired error item (with the HTTP status and SerpKite's error `code`) and processes remaining inputs.

The node supports n8n AI Agent tool connections (`usableAsTool`). It uses n8n's built-in authenticated HTTP helper and has no runtime dependencies.

### Version 1 workflows

Version 2 of the node (0.2.0) adds resources. Workflows created with 0.1.0 keep node version 1, which still offers Web Search, News Search and Fetch Webpage with the same parameters and behavior. To use the new operations in such a workflow, add a new SerpKite node.

## Development

```sh
npm ci
npm run lint
npm test
```

Tests mock the HTTP helper and cover the request (method, path, body and timeout) of every operation, version 1 compatibility, option conversion (lists, dates, JSON schemas), Markdown responses, task polling, item pairing, error handling, credential authentication, and rejection of unknown operations and task IDs. They do not consume API credits.

## Release and provenance

The publish workflow runs tests and lint, then publishes with npm provenance from a version tag using npm trusted publishing (GitHub OIDC). The trusted publisher is configured for owner `SerpKite`, repository `n8n-nodes-serpkite`, and workflow `publish.yml`. No npm token or repository publish secret is required. Running the **Publish** workflow manually (workflow dispatch) checks the trusted publisher by exchanging the workflow's OIDC token with npm, without publishing. Push a tag matching the package version, such as `v0.2.1`, only when releasing that version.

After publication, submit the package at [n8n Creator Portal](https://creators.n8n.io) for verification. Verification is reviewed by n8n.

## License

MIT. Based on n8n's official node starter.
