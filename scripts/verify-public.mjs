import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const expectedGates = ["test", "typecheck", "lint", "coverage", "build", "audit"];
const startedAt = Date.now();
let launchError = false;
const child = spawn("npm", ["run", "verify"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("error", () => { launchError = true; });
child.on("close", (exitCode, signal) => {
  let ledger;
  try {
    ledger = JSON.parse(readFileSync("verification-result.json", "utf8"));
    if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) {
      throw new Error("Invalid ledger object");
    }
  } catch {
    ledger = null;
  }

  const ledgerTime = Date.parse(ledger?.verifiedAt);
  const fresh = Number.isFinite(ledgerTime) && ledgerTime >= startedAt && ledgerTime <= Date.now();
  if (!fresh) {
    ledger = {
      schemaVersion: 1,
      project: "art-that-imitates-art",
      scope: "PR1 TypeScript substrate",
      verifiedAt: new Date().toISOString(),
      gates: [],
    };
  }

  if (!Array.isArray(ledger.gates)) {
    ledger.gates = [];
  }

  const complete = ledger.gates.length === expectedGates.length
    && expectedGates.every((name, index) => {
      const gate = ledger.gates[index];
      return gate?.name === name && gate.passed === true && gate.exitCode === 0;
    });

  const passed = !launchError && exitCode === 0 && signal === null
    && fresh && ledger.passed === true && complete;
  ledger.passed = passed;
  ledger.verifierExitCode = exitCode;
  if (!passed) {
    ledger.error = launchError ? "Verifier could not start"
      : !fresh ? "No fresh verification ledger was produced"
      : exitCode !== 0 || signal !== null ? "Verifier process failed"
      : "One or more verification gates did not pass";
  }

  const server = createServer((req, res) => {
    if (req.url === "/verification-result.json") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      res.end(JSON.stringify(ledger, null, 2));
      return;
    }

    const verdict = ledger.passed ? "PASS" : "FAIL";
    const gates = ledger.gates
      .map(
        (gate) =>
          `<li><strong>${escapeHtml(String(gate?.name ?? "unknown"))}</strong>: ${gate?.passed === true ? "PASS" : "FAIL"} (exit ${escapeHtml(String(gate?.exitCode ?? "unknown"))})</li>`,
      )
      .join("");

    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ATIA PR1 Verification — ${verdict}</title>
<style>
body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:760px;margin:8vh auto;padding:0 24px;line-height:1.5}
h1{font-size:clamp(2rem,8vw,4rem);margin-bottom:.25rem}
.pass{color:#17803d}.fail{color:#b42318}
pre{overflow:auto;padding:16px;border:1px solid currentColor;border-radius:8px}
</style>
</head>
<body>
<p>ATIA / PR1 / Public Verification</p>
<h1 class="${ledger.passed ? "pass" : "fail"}">${verdict}</h1>
<p>Verified at: ${escapeHtml(String(ledger.verifiedAt))}</p>
<ul>${gates}</ul>
<pre>${escapeHtml(JSON.stringify(ledger, null, 2))}</pre>
</body>
</html>`);
  });

  server.listen(Number(process.env.PORT) || 3000, "0.0.0.0", () => {
    console.log("\nPublic verification report is ready");
  });
});

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
