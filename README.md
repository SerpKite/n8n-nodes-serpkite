# n8n-nodes-serpkite

Use [SerpKite](https://serpkite.com) to search Google, search Google News, and read public webpages or PDFs as Markdown in n8n workflows and AI agents.

## Installation

In self-hosted n8n, go to **Settings → Community nodes → Install** and enter `n8n-nodes-serpkite` once the npm package is published. See [n8n's community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

This repository is implemented and tested. npm publication and n8n Creator Portal verification are separate release steps; do not assume the package is already published or verified.

## Credentials

Create an account at [app.serpkite.com](https://app.serpkite.com), create an API key, and paste the complete `skt_live_...` secret into a **SerpKite API** credential. n8n stores the credential and adds its Bearer header; the key is never placed in a query string. The credential test calls `/v1/account` and does not perform a paid search.

## Operations

- **Web Search**: Structured Google organic results in `results`.
- **News Search**: Structured Google News results in `results`.
- **Fetch Webpage**: Read a public HTML/PDF URL and return Markdown and metadata.

Search supports country and language codes, 1–100 requested results, and hour/day/week/month/year time windows. Result counts round up to pages. Depth costs one credit per page returned, capped at seven credits for 100 results. Empty and failed searches are not billed. Fetch Webpage costs one credit on success. See [API docs](https://serpkite.com/docs) for current behavior.

Each input item produces one complete response envelope including `meta`. Use n8n's **Split Out** node on `results` to process search hits individually. Item pairing preserves expressions that refer to earlier nodes. Errors stop the workflow by default; n8n's continue-on-error setting produces a paired error item and processes remaining inputs.

The node supports n8n AI Agent tool connections (`usableAsTool`). It uses n8n's built-in authenticated HTTP helper and has no runtime dependencies.

## Development

```sh
npm ci
npm run lint
npm test
```

Tests mock the HTTP helper and cover multi-item search/news, localization, item pairing, full envelopes, empty results, webpage POST, error handling, credential authentication, and unknown-operation rejection. They do not consume API credits.

## Release and provenance

The publish workflow runs tests and lint, then publishes with npm provenance from a version tag. Configure npm trusted publishing for owner `SerpKite`, repository `n8n-nodes-serpkite`, workflow `publish.yml`, or provide the repository's `NPM_TOKEN` secret. The initial npm package may need to be created using an authenticated npm session before trusted publishing can be enabled. Create a version tag only after npm publishing access is ready.

After publication, submit the package at [n8n Creator Portal](https://creators.n8n.io) for verification. Verification is reviewed by n8n.

## License

MIT. Based on n8n's official node starter.
