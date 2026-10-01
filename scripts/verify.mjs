import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const gates = [
  ["test", ["run", "test"]],
  ["typecheck", ["run", "typecheck"]],
  ["lint", ["run", "lint"]],
  ["coverage", ["run", "test:coverage"]],
  ["build", ["run", "build"]],
  ["audit", ["audit", "--audit-level=high"]],
];

const results = [];
let failed = false;

for (const [name, args] of gates) {
  const startedAt = new Date().toISOString();
  const proc = spawnSync("npm", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  const exitCode = proc.status ?? 1;
  const endedAt = new Date().toISOString();

  results.push({ name, exitCode, passed: exitCode === 0, startedAt, endedAt });
  if (exitCode !== 0) {
    failed = true;
    break;
  }
}

const ledger = {
  schemaVersion: 1,
  project: "art-that-imitates-art",
  scope: "PR1 TypeScript substrate",
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "local-or-browser",
  verifiedAt: new Date().toISOString(),
  passed: !failed && results.length === gates.length,
  gates: results,
};

writeFileSync("verification-result.json", JSON.stringify(ledger, null, 2) + "\n");
console.log("\n=== ATIA PR1 VERIFICATION LEDGER ===");
console.log(JSON.stringify(ledger, null, 2));

process.exit(ledger.passed ? 0 : 1);
