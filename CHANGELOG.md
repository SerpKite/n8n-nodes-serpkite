# Changelog

## 0.2.0

- Add node version 2 with resources covering the public API: web, news, image, video, shopping, scholar and patent search and autocomplete; maps and local search, place details and reviews; webpage, extract (with AI summary and schema extraction), site map and crawl; cited answers and research; ChatGPT, Gemini, Copilot, AI Mode and Brave AI answers; account.
- Add Wait for Completion for crawls and research, with bounded polling.
- Add Compact and Markdown response formats, and per-operation request timeouts (two minutes for AI answers).
- Continue-on-error items carry the HTTP status and SerpKite's error code.
- Version 1 (Web Search, News Search, Fetch Webpage) is unchanged; existing workflows keep it.
- Add a manual trusted-publisher check to the publish workflow.

## 0.1.0

- Add Google web search, Google News search, and webpage Markdown operations.
- Add API credential validation, AI Agent tool support, item pairing, and error handling.
- Add transport tests and provenance publishing workflow.
