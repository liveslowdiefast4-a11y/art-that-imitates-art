# Sovereign Cloud — Zero-Cost Local-First Build

Hard invariant: `allowPaidInference = false`.

## Runtime
1. WebGPU available → WebLLM runs an instruction model locally.
2. WebGPU unavailable/fails → Transformers.js runs a small quantized model through browser CPU/WASM.
3. If local inference cannot initialize → the PWA shell stays available and never calls a paid fallback.

The first model load requires network access to download model/runtime assets. Browser caches store those assets for subsequent use.

## Cloudflare Pages
This directory is intentionally static:
- no `functions/`
- no server API
- no paid inference route
- `_routes.json` excludes all paths from Functions
- `_headers` limits browser permissions

For Pages Direct Upload or Git deployment, use this directory as the site root/build output.

## Cost rule
Do not add a provider unless its adapter rejects any request that could incur a charge.
Never enable auto-top-up.
Never add a payment method as an availability mechanism.
