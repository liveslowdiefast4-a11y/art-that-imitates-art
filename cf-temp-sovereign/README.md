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

## Chimera Net rc2

Project Chimera Net v0.2.1-rc2 is integrated as a browser-local safety/kernel adapter. The UI runs the periodic wave lattice and corrected discrete CBF against explicitly labelled synthetic telemetry. Browser execution is permanently non-actuating: Genesis shared secrets and Earth Engine credentials are not shipped to static assets, and AUTHENTICATED_LIVE requires a separate trusted server-side gateway. The browser adapter therefore cannot elevate itself to live actuation.

Adversarial tests live in `tests/chimera-kernel.test.mjs` and cover the former alpha=1.8 counterexample, recovery from outside the invariant set, periodic energy, actuation interlocks, and browser trust non-elevation.
