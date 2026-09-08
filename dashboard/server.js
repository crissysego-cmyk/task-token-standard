const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const PORT = 3000;
const HOST = "0.0.0.0";
const ROOT = "/app";
const PUBLIC = path.join(__dirname, "public");

// ── State ──────────────────────────────────────────────────────────────────
let verifyResults = null;
let e2eState = { status: "pending", output: "", summary: null };

// ── Vector verification (Python, zero deps) ─────────────────────────────────
const VECTORS = [
  {
    name: "public-v1",
    label: "Public Task (v1)",
    desc: "Standard public task package — 7 leaves, all fetched + verified",
    args: [
      "--tdhash", "0x6ad6b032933bab0eea72722fa4145290c3065ec3904ba63b99aaf188882bef51",
      "--taskhash", "0x4c26ef3db14754bd03d67c37ce4bb5857ab28f0b0238779c73e5b6bba8b543f0",
      "--max-completions", "10",
    ],
  },
  {
    name: "update-v2-companion-only",
    label: "Companion Update (v2)",
    desc: "Version chain — companion-only update with constant tdHash",
    args: [
      "--tdhash", "0x6ad6b032933bab0eea72722fa4145290c3065ec3904ba63b99aaf188882bef51",
      "--taskhash", "0x9c49e24773229328e619a92848317b136c0a662015c8d45d9d8f6a527f6e6fce",
      "--version", "2",
      "--previous-taskhash", "0x4c26ef3db14754bd03d67c37ce4bb5857ab28f0b0238779c73e5b6bba8b543f0",
      "--max-completions", "10",
    ],
  },
  {
    name: "confidential-v1",
    label: "Confidential Task (v1)",
    desc: "Encrypted scope — confidentiality descriptor cross-matched, 2 objects decrypted",
    args: [
      "--tdhash", "0x6ad6b032933bab0eea72722fa4145290c3065ec3904ba63b99aaf188882bef51",
      "--taskhash", "0x48b965c94e6f6148ed2c0957c11e39c7cf4ae98e66c3eaebb0455b9b282b2dab",
      "--key", "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
      "--max-completions", "10",
    ],
  },
];

function runVerification() {
  return VECTORS.map((v) => {
    try {
      const cmd = `python3 tools/task-pack/verify.py vectors/${v.name} ${v.args.join(" ")}`;
      const output = execSync(cmd, {
        cwd: ROOT,
        timeout: 30000,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { name: v.name, label: v.label, desc: v.desc, passed: true, output: output.trim() };
    } catch (err) {
      const output = (err.stdout || "") + (err.stderr || "") || err.message;
      return { name: v.name, label: v.label, desc: v.desc, passed: false, output: output.trim() };
    }
  });
}

// ── E2E lifecycle test (solc-js + ganache + ethers, 108 assertions) ────────
function runE2E() {
  e2eState = { status: "running", output: "", summary: null };
  const child = spawn("bash", ["scripts/local_e2e.sh"], {
    cwd: ROOT,
    env: { ...process.env },
  });
  let output = "";
  child.stdout.on("data", (d) => {
    output += d.toString();
    e2eState.output = output;
  });
  child.stderr.on("data", (d) => {
    output += d.toString();
    e2eState.output = output;
  });
  child.on("close", (code) => {
    const match = output.match(/SMOKE RESULT:\s*(\d+)\s+passed,\s*(\d+)\s+failed/);
    e2eState = {
      status: code === 0 ? "passed" : "failed",
      output,
      summary: match
        ? { passed: parseInt(match[1]), failed: parseInt(match[2]) }
        : null,
    };
  });
}

// ── Project info ───────────────────────────────────────────────────────────
function getProjectInfo() {
  return {
    name: "Task Token as a Reverse Asset",
    kernel: "TASK-KERNEL v3.0",
    erc: "ERC Draft (erc-9999.md)",
    description:
      "An ERC-721 extension that binds a token to a hash-verifiable task tender. The chain anchors exactly which task specification, acceptance criteria, version, and publication history a token commits to — with an escrowed reward paid per accepted completion.",
    contracts: [
      { name: "TaskToken", size: "23,766 bytes", note: "EIP-170 limit 24,576" },
      { name: "TaskVault", size: "1,205 bytes", note: "per-token locked vault" },
      { name: "JuryPanel", size: "2,720 bytes", note: "K-of-N reference judging authority" },
      { name: "HashlockVerifier", size: "1,651 bytes", note: "machine-settlement verifier" },
    ],
    interfaces: [
      { name: "ITaskToken", id: "0xcdaeb26d" },
      { name: "ITaskTender", id: "0xc319d532" },
      { name: "ITaskVerifier", id: "0x9977db15" },
      { name: "IOnchainTaskDocument", id: "0xeb078d05" },
    ],
    deployments: [
      { id: 1, example: "vectors/public-v1", judgment: "Judged (N=1)", outcome: "Frozen and funded; live reference tender" },
      { id: 2, example: "case-2-media-sla", judgment: "Judged (N=1)", outcome: "4 periods paid, 1 refunded, cancelled, vault zero" },
      { id: 3, example: "case-3-invoice-agent", judgment: "Judged (N=1)", outcome: "Rev 1 rejected, rev 2 accepted, exclusive award spent" },
      { id: 4, example: "case-3-invoice-agent (deadline)", judgment: "Judged (N=1)", outcome: "Delivered in time, buyer ran clock, fulfiller claimed by default" },
      { id: 5, example: "case-4-tax-opinion", judgment: "Judged (N=1)", outcome: "Scope revised v1→v2, opinion delivered and accepted" },
      { id: 6, example: "case-5-benchmark-consortium", judgment: "Committee (2-of-2)", outcome: "Release 1 accepted at quorum, split 50/30/20; release 2 rejected on timeout" },
      { id: 7, example: "case-1-labeling-qa", judgment: "Machine (N=0)", outcome: "3 of 3 batches settled with no judge in the loop" },
    ],
  };
}

// ── HTTP server ────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (url.pathname === "/api/verify") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(verifyResults));
    return;
  }
  if (url.pathname === "/api/e2e") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(e2eState));
    return;
  }
  if (url.pathname === "/api/info") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getProjectInfo()));
    return;
  }

  // Static files
  const filePath = path.join(
    PUBLIC,
    url.pathname === "/" ? "index.html" : url.pathname
  );
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

// ── Startup ────────────────────────────────────────────────────────────────
console.log("[dashboard] running vector verification...");
verifyResults = runVerification();
const vPassed = verifyResults.filter((r) => r.passed).length;
console.log(`[dashboard] verification: ${vPassed}/${verifyResults.length} vectors passed`);

console.log("[dashboard] starting E2E lifecycle test in background...");
runE2E();

server.listen(PORT, HOST, () => {
  console.log(`[dashboard] listening on http://${HOST}:${PORT}`);
});
