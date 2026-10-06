#!/usr/bin/env node
import { spawnSync } from "node:child_process";

function run(args, options = {}) {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["--yes", "wrangler@latest", ...args],
    {
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: "utf8",
      env: process.env
    }
  );
  return result;
}

function authenticated() {
  const result = run(["whoami", "--json"], { capture: true });
  if (result.status === 0) {
    try {
      const info = JSON.parse(result.stdout);
      const accounts = Array.isArray(info?.accounts) ? info.accounts : [];
      const summary = accounts.map(a => ({
        id: a.id,
        name: a.name
      }));
      console.log("Cloudflare authentication verified.");
      if (summary.length) console.log(JSON.stringify({ accounts: summary }, null, 2));
      return true;
    } catch {
      console.log("Cloudflare authentication verified.");
      return true;
    }
  }
  return false;
}

console.log("Sovereign Cloud — Cloudflare authenticated connection");
console.log("Mode: OAuth device flow · no API token pasted into chat · no paid fallback");

if (!authenticated()) {
  console.log("\nNo active Wrangler authentication found.");
  console.log("Starting Cloudflare OAuth device authorization...");
  console.log("Approve the Cloudflare-owned verification page when Wrangler prints the URL/code.\n");

  const login = run(["login", "--device", "--browser=false"]);
  if (login.status !== 0) {
    console.error("\nCloudflare OAuth was not completed.");
    process.exit(login.status ?? 1);
  }

  if (!authenticated()) {
    console.error("\nOAuth returned but Wrangler still cannot verify the account.");
    process.exit(2);
  }
}

console.log("\nCONNECTED: Wrangler is authenticated to Cloudflare.");
console.log("No deployment was performed by this command.");
