import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const API = "https://api.cloudflare.com/client/v4";
const SITE_DIR = path.resolve("cf-temp-sovereign");
const SCRIPT_NAME = "sovereign-cloud";
const COMPAT_DATE = new Date().toISOString().slice(0, 10);
const MAX_POW = 64_000_000;

function fail(message) {
  console.error("\n❌ " + message);
  process.exit(1);
}

function mimeFor(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8"
  })[ext] || "application/octet-stream";
}

async function apiJson(url, options = {}, label = "Cloudflare API") {
  const res = await fetch(url, options);
  let body;
  try { body = await res.json(); }
  catch { body = null; }

  if (!res.ok || !body?.success) {
    const errors = body?.errors?.map(e => e.message || String(e.code)).filter(Boolean);
    throw new Error(`${label} failed (HTTP ${res.status})${errors?.length ? ": " + errors.join("; ") : ""}`);
  }
  return body.result;
}

function b64urlDecode(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function solveChallenge({ challengeToken, seed, k, g }) {
  const seedBytes = b64urlDecode(seed);
  if (seedBytes.length !== 32) throw new Error("Challenge seed must decode to 32 bytes.");
  if (!Number.isInteger(k) || k <= 0 || !Number.isInteger(g) || g <= 0) {
    throw new Error("Invalid proof-of-work challenge parameters.");
  }
  if (k * g > MAX_POW) throw new Error(`Challenge exceeds safe limit: ${k * g} > ${MAX_POW}`);

  console.log(`🧮 Solving Cloudflare proof-of-work (${k} × ${g})…`);
  const checkpoints = [];
  let hash = crypto.createHash("sha256").update(seedBytes).digest();
  checkpoints.push(hash);

  for (let segment = 0; segment < k; segment++) {
    for (let iteration = 0; iteration < g; iteration++) {
      hash = crypto.createHash("sha256").update(hash).digest();
    }
    checkpoints.push(hash);
    if ((segment + 1) % Math.max(1, Math.floor(k / 10)) === 0) {
      process.stdout.write(".");
    }
  }
  process.stdout.write("\n");
  return {
    challengeToken,
    solution: { checkpoints: Buffer.concat(checkpoints).toString("base64") }
  };
}

function walkFiles(root) {
  const out = [];
  function walk(dir, rel = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const childRel = path.join(rel, entry.name);
      if (entry.isDirectory()) walk(full, childRel);
      else if (entry.isFile()) out.push({ full, rel: childRel.replace(/\\/g, "/") });
    }
  }
  walk(root);
  return out;
}

function makeManifest(files) {
  const manifest = {};
  const byHash = new Map();

  for (const file of files) {
    // _routes.json is Pages-specific, not Workers Static Assets configuration.
    if (file.rel === "_routes.json") continue;
    // _headers is supplied through assets.config below, not as a public asset.
    if (file.rel === "_headers") continue;

    const bytes = fs.readFileSync(file.full);
    const ext = path.extname(file.rel).slice(1);
    const hash = crypto
      .createHash("sha256")
      .update(bytes.toString("base64") + ext)
      .digest("hex")
      .slice(0, 32);

    manifest["/" + file.rel] = { hash, size: bytes.length };
    if (!byHash.has(hash)) byHash.set(hash, { ...file, bytes, hash });
  }
  return { manifest, byHash };
}

async function main() {
  if (!fs.existsSync(SITE_DIR)) fail(`Missing site directory: ${SITE_DIR}`);
  if (!fs.existsSync(path.join(SITE_DIR, "index.html"))) fail("index.html is missing.");

  console.log("☁️  Sovereign Cloud — direct temporary deployment");
  console.log("🔒 No Wrangler, no workerd, no Cloudflare login, no paid fallback.");
  console.log("📜 Using your explicit acceptance of Cloudflare Terms and Privacy Policy.");
  console.log(`🕒 Cloudflare compatibility date (UTC): ${COMPAT_DATE}`);

  console.log("\n1/7 Requesting temporary-account challenge…");
  const challenge = await apiJson(
    `${API}/provisioning/previews/challenge`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}"
    },
    "Challenge request"
  );

  console.log("2/7 Solving challenge…");
  const solved = solveChallenge(challenge);

  console.log("3/7 Creating temporary Cloudflare account…");
  const preview = await apiJson(
    `${API}/provisioning/previews`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        termsOfService: "https://www.cloudflare.com/terms/",
        privacyPolicy: "https://www.cloudflare.com/privacypolicy/",
        acceptTermsOfService: "yes",
        challengeToken: solved.challengeToken,
        solution: solved.solution
      })
    },
    "Temporary account creation"
  );

  const accountId = preview?.account?.id;
  const apiToken = preview?.account?.apiToken;
  const claimUrl = preview?.claim?.url;
  const claimExpires = preview?.claim?.expiresAt;
  if (!accountId || !apiToken || !claimUrl) throw new Error("Temporary account response is incomplete.");

  const auth = { Authorization: `Bearer ${apiToken}` };

  console.log("4/7 Building asset manifest…");
  const files = walkFiles(SITE_DIR);
  const { manifest, byHash } = makeManifest(files);
  console.log(`   ${Object.keys(manifest).length} assets ready.`);

  console.log("5/7 Uploading static assets…");
  const session = await apiJson(
    `${API}/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}/assets-upload-session`,
    {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ manifest })
    },
    "Asset upload session"
  );

  const uploadJwt = session.jwt;
  const buckets = session.buckets || [];
  let completionJwt = buckets.length === 0 ? uploadJwt : undefined;

  if (!uploadJwt) throw new Error("Cloudflare did not return an asset upload token.");

  for (let i = 0; i < buckets.length; i++) {
    const form = new FormData();
    for (const hash of buckets[i]) {
      const file = byHash.get(hash);
      if (!file) throw new Error(`Cloudflare requested unknown asset hash: ${hash}`);
      const encoded = file.bytes.toString("base64");
      // Cloudflare's Workers Assets API expects a map of hash -> base64 string.
      // Use a plain multipart field, not a file/Blob part.
      form.append(hash, encoded);
    }

    const res = await fetch(
      `${API}/accounts/${accountId}/workers/assets/upload?base64=true`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${uploadJwt}` },
        body: form
      }
    );

    let body = null;
    try { body = await res.json(); } catch {}
    if (!res.ok || !body?.success) {
      const errors = body?.errors?.map(e => e.message || String(e.code)).filter(Boolean);
      throw new Error(`Asset upload failed (HTTP ${res.status})${errors?.length ? ": " + errors.join("; ") : ""}`);
    }
    if (body?.result?.jwt) completionJwt = body.result.jwt;
    console.log(`   bucket ${i + 1}/${buckets.length} uploaded (HTTP ${res.status}${body?.result?.jwt ? ", completion token received" : ""})`);
  }

  if (!completionJwt) throw new Error("Cloudflare did not return an asset completion token after the final bucket.");

  const jwtSegments = String(completionJwt).split(".");
  if (jwtSegments.length !== 3) {
    throw new Error(`Cloudflare returned a malformed asset completion token (segments=${jwtSegments.length}). Refusing to deploy with it.`);
  }

  console.log("6/7 Deploying Worker + assets…");
  const workerSource = `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};`;

  const headersFile = path.join(SITE_DIR, "_headers");
  const headersText = fs.existsSync(headersFile) ? fs.readFileSync(headersFile, "utf8") : undefined;

  const metadata = {
    main_module: "worker.mjs",
    compatibility_date: COMPAT_DATE,
    assets: {
      jwt: completionJwt,
      config: {
        not_found_handling: "single-page-application",
        ...(headersText ? { _headers: headersText } : {})
      }
    },
    bindings: [{ name: "ASSETS", type: "assets" }]
  };

  const deployForm = new FormData();
  // Match Cloudflare's multipart contract: metadata is a JSON-encoded text field.
  deployForm.append("metadata", JSON.stringify(metadata));
  deployForm.append("worker.mjs", new Blob([workerSource], { type: "application/javascript+module" }), "worker.mjs");

  const deployRes = await fetch(
    `${API}/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}`,
    { method: "PUT", headers: auth, body: deployForm }
  );
  let deployBody = null;
  try { deployBody = await deployRes.json(); } catch {}
  if (!deployRes.ok || !deployBody?.success) {
    const errors = deployBody?.errors?.map(e => e.message || String(e.code)).filter(Boolean);
    throw new Error(`Worker deployment failed (HTTP ${deployRes.status})${errors?.length ? ": " + errors.join("; ") : ""}`);
  }

  console.log("7/7 Enabling workers.dev and verifying…");
  await apiJson(
    `${API}/accounts/${accountId}/workers/scripts/${SCRIPT_NAME}/subdomain`,
    {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ enabled: true, previews_enabled: false })
    },
    "Enable workers.dev"
  );

  const accountSubdomain = await apiJson(
    `${API}/accounts/${accountId}/workers/subdomain`,
    { headers: auth },
    "Get workers.dev subdomain"
  );
  const subdomain = accountSubdomain?.subdomain;
  if (!subdomain) throw new Error("Cloudflare did not return a workers.dev subdomain.");

  const liveUrl = `https://${SCRIPT_NAME}.${subdomain}.workers.dev`;

  let verified = false;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(liveUrl, { redirect: "follow" });
      const text = await res.text();
      if (res.ok && text.includes("Sovereign Cloud")) {
        verified = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("\n✅ DEPLOYMENT COMPLETE");
  console.log("🌍 Live URL:");
  console.log(liveUrl);
  console.log("\n🔑 CLAIM URL — keep this private and complete the claim within the Cloudflare window:");
  console.log(claimUrl);
  if (claimExpires) console.log("\n⏳ Claim expires:", claimExpires);
  console.log("\n🔎 Verification:", verified ? "PASS — Sovereign Cloud loaded" : "PENDING — URL created but edge propagation may still be catching up");
  console.log("\nThe temporary API token was used only in memory and was never printed.");
}

main().catch(err => fail(err?.message || String(err)));
