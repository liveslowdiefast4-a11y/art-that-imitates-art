import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const child = spawn("npm", ["run", "verify"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", () => {
  let ledger;
  try {
    ledger = JSON.parse(readFileSync("verification-result.json", "utf8"));
  } catch {
    ledger = {
      schemaVersion: 1,
      project: "art-that-imitates-art",
      scope: "PR1 TypeScript substrate",
      verifiedAt: new Date().toISOString(),
      passed: false,
      gates: [],
      error: "verification-result.json was not produced",
    };
  }

  const server = createServer((req, res) => {
    if (req.url === "/verification-result.json") {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(ledger, null, 2));
      return;
    }

    const verdict = ledger.passed ? "PASS" : "FAIL";
    const gates = ledger.gates
      .map(
        (gate) =>
          `<li><strong>${gate.name}</strong>: ${gate.passed ? "PASS" : "FAIL"} (exit ${gate.exitCode})</li>`,
      )
      .join("");

    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
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
<p>Verified at: ${ledger.verifiedAt}</p>
<ul>${gates}</ul>
<pre>${escapeHtml(JSON.stringify(ledger, null, 2))}</pre>
</body>
</html>`);
  });

  server.listen(3000, "0.0.0.0", () => {
    console.log("\nPublic verification report: http://localhost:3000");
  });
});

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
