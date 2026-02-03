# TuLotero Proxy (Docker)

Simple Node/Express proxy that fetches the Euromillones results page from TuLotero, parses the numbers and returns JSON { winNums, winStars, source }.

Configuration via environment variables:
- PROXY_KEY: optional API key to protect the endpoint
- CACHE_TTL: seconds to cache the last response (default 600)
- ALLOWED_ORIGINS: CORS Allow-Origin header (default '*')
- PORT: server port (default 3000)

Build & push example (Docker Hub):

1. Build locally:
   docker build -t <youruser>/tulotero-proxy:latest ./fetcher

2. Push:
   docker login
   docker push <youruser>/tulotero-proxy:latest

3. Use in your stack / Portainer by setting image to `<youruser>/tulotero-proxy:latest` and env var PROXY_KEY to a secret value.

Endpoint:
GET /fetch?key=YOUR_KEY (or set header x-api-key)

Returns JSON:
{ winNums: [n1,..,n5], winStars: [s1,s2], source: 'tulotero' }
