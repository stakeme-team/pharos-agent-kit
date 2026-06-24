# Pharos Agent Kit — Session Context

This file preserves context between development sessions. Read this at the start of a new session to understand the project state, decisions made, and what's left to do.

## Project Overview

MCP-based toolkit for Pharos blockchain. Two usage modes:
1. **Subscription** — Claude Code / Cursor / Codex via `.mcp.json` (main flow)
2. **AI SDK** — programmatic agents (Vercel AI SDK + Claude/OpenAI)

MCP server: `https://api.pharos.exploreme.pro/mcp` (69+ tools, HTTP transport)

## Key Architecture Decisions

### Security: Two protection levels

1. **Simple mode** — key in `.env`, `guard.sh` hook blocks agent from reading it
2. **Secure mode** — key encrypted in `.keystore/wallet.json`, signing daemon on Unix socket

**Agent never sees the private key.** Signing happens via `sign-tx.ts` (stdin JSON → stdout signed hex).

### Wallet creation

Agent CAN safely run `npx tsx scripts/wallet-manager.ts generate --simple`:
- Script generates key internally
- Saves to `.env` 
- stdout shows ONLY the address (not the key)
- guard.sh does NOT block this command

### Signing Daemon modes

- **Auto** (default) — signs immediately
- **Manual** (`--manual` flag) — shows full TX JSON, waits for y/n approval
- **Password file** — `.keystore/.password` for Docker detached mode

### Docker isolation

- `signer` container: `network_mode: none` (no network even if npm package malicious)
- `node_modules` in Docker volume (not host)
- Source mounted, deps isolated

## MCP Configs (per platform)

- Claude Code: `.mcp.json` with `"type": "http"` (NOT `"url"` — that's a common mistake)
- Cursor: `.cursor/mcp.json`
- Codex: `.codex/config.toml` with `mcp-remote` bridge (Codex only supports STDIO)

## Files That Matter

### Security-critical
- `scripts/guard.sh` — blocks 27 attack vectors (allows `grep WALLET_ADDRESS .env`)
- `scripts/security-test.ts` — 27/27 passing
- `scripts/keystore-utils.ts` — encrypt/decrypt (Ethereum V3 format)
- `scripts/wallet-manager.ts` — generate/import (imports from keystore-utils)
- `scripts/sign-tx.ts` — CLI signer (simple mode: .env, secure: via socket)
- `scripts/signer-daemon.ts` — Unix socket server, manual/auto modes

### Core (AI SDK)
- `src/mcp-client.ts` — `createMCPClient` wrapper
- `src/signing-bridge.ts` — intercepts prepare_* tool results, signs
- `src/agent.ts` — multi-provider (Claude/OpenAI)
- `src/wallet.ts` — address getter + signing interface

### Agent instructions
- `CLAUDE.md` — agent rules (CRITICAL: read this on new sessions)
- `.claude/skills/wallet.md` — `/wallet` command
- `.claude/skills/send.md` — `/send` command
- `.claude/skills/deploy.md` — `/deploy` command
- `.claude/settings.json` — guard.sh hook config

## Bugs Fixed (Don't Repeat!)

1. `guard.sh` — `grep.*\.env` was too broad, blocked `grep WALLET_ADDRESS .env`. Fixed with explicit allowlist.
2. `signer-daemon` — `signTransaction` lost `this` binding. Fixed with `signFn.call(account, ...)`.
3. `signer-daemon` — `net.createServer` default `allowHalfOpen: false` dropped response. Fixed with `{ allowHalfOpen: true }`.
4. `wallet-manager` — `const privateKey` can't be zeroed. Use `let`.
5. `signer-daemon` — importing from `wallet-manager.ts` ran CLI code. Extracted to `keystore-utils.ts`.
6. `.mcp.json` — `"type": "url"` broken, must be `"type": "http"`.
7. Dockerfile — Alpine lacks bash, needed `apk add bash` for guard.sh.

## Testing Checklist (see plan file for full list)

- `docker run --rm -v "$(pwd):/app" -w /app node:20-alpine npx tsc --noEmit` → 0 errors
- `npx tsx scripts/security-test.ts` → 27/27 passed (run in Docker with bash)
- `npx tsx scripts/wallet-manager.ts generate --simple` → address in stdout, key in .env
- `echo '{"to":"0x..."}' | npx tsx scripts/sign-tx.ts` → signed hex

## npm Dependencies

Use `docker compose run --rm install` (network_mode: host) to install safely.
Key packages: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/mcp`, `viem`, `dotenv`.

## Commands User Runs (not agent)

- `npx tsx scripts/wallet-manager.ts generate --secure` (interactive password)
- `npx tsx scripts/signer-daemon.ts` or `--manual` (interactive password)
- `docker compose up -d signer` (with `.keystore/.password` file)

## Commands Agent Can Run

- `grep WALLET_ADDRESS .env | cut -d'=' -f2`
- `npx tsx scripts/wallet-manager.ts generate --simple` (safe!)
- `echo '<unsigned_tx>' | npx tsx scripts/sign-tx.ts`
- All MCP tools (69+) for transactions, balances, blocks, contracts

## What's Left / Next Steps

- [ ] Test full E2E flow with Claude Code on testnet
- [ ] Verify Demo 1/2/3 end-to-end with real API key
- [ ] Test Codex setup with mcp-remote bridge
- [ ] Add staking tools (new MCP tools available: prepare_delegate, prepare_undelegate, etc.)

## References

- Plan file: `~/.claude/plans/splendid-mixing-petal.md` (full architecture)
- Pharos MCP docs: `https://api.pharos.exploreme.pro/mcp`
- Faucetme: https://api.dev.faucetme.pro (default slug: `pharos`)
