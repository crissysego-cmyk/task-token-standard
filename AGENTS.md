# Base44 Setup Notes

## What this project is

A Solidity smart-contract reference implementation for the ERC draft
"Token-Bound Task Tenders" (TASK-KERNEL v3.0). There is **no web frontend or
backend API** — the project is contracts + a deterministic toolchain + test
vectors. The "app" that runs in the preview is a dashboard (`dashboard/`)
that executes the project's own verification and lifecycle tests and shows
the results.

## How it runs (docker-compose.base44.yml)

- **Service `web`** — built from `dashboard/Dockerfile` (node:22-bookworm +
  python3 + global `solc@0.8.24` and `ganache`). Source is bind-mounted at
  `/app`; `node_modules` is a named volume so `ethers@6` persists across
  restarts.
- On startup, `dashboard/server.js` (pure Node.js http, zero npm deps):
  1. Runs the Python vector verification (`tools/task-pack/verify.py`) on all
     three frozen vectors — synchronous, ~1s.
  2. Kicks off `scripts/local_e2e.sh` in the background (solc-js compile →
     ganache → 108-assertion smoke test, ~30-60s).
  3. Serves a dashboard on port 3000 with JSON APIs: `/api/verify`,
     `/api/e2e`, `/api/info`.

## Verification commands (run inside the container or on host)

```bash
# Vector verification (zero deps, just python3)
python3 tools/task-pack/verify.py vectors/public-v1 \
  --tdhash 0x6ad6b032933bab0eea72722fa4145290c3065ec3904ba63b99aaf188882bef51 \
  --taskhash 0x4c26ef3db14754bd03d67c37ce4bb5857ab28f0b0238779c73e5b6bba8b543f0 \
  --max-completions 10

# E2E lifecycle (needs solcjs + ganache global, ethers local)
bash scripts/local_e2e.sh   # expects: SMOKE RESULT: 108 passed, 0 failed
```

## Secrets

None required. All tooling is local (Python stdlib, ganache local chain).
The confidential vector's `KEY.demo` is a non-cryptographic test key committed
in the repo.

## Health check

`GET /` returns the dashboard HTML (200). The preview port is 3000.
