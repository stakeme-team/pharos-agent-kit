# Pharos Agent Kit

MCP-based toolkit for interacting with the [Pharos](https://pharos.exploreme.pro) blockchain through AI agents or terminal. Claim faucet tokens, send transactions, deploy & verify contracts, explore blocks and tokens — all from a single workspace, without switching between explorer, faucet, and wallet UIs.

**Your private key never leaves your machine.** MCP prepares unsigned transactions, but signing always happens locally. The key is never sent to the AI model or remote server. Two levels of protection: **Simple** — a guard hook blocks the agent from reading `.env`; **Secure** — an advanced signing daemon keeps the key encrypted and isolated in a separate process, the agent only receives the signed hash.

**Two ways to use:**

1. **Subscription** (free) — connect MCP to Claude Code / Cursor / Codex, use your existing subscription
2. **AI SDK** (developers) — programmatic agents via Vercel AI SDK with Claude or OpenAI

## Architecture

```
┌────────────────────────────┐
│  You (chat or code)        │
├────────────────────────────┤
│  AI Agent                  │
│  (Claude / GPT / local)    │
│                            │
│  Sees: wallet address,     │
│        MCP tool results    │
│  Never sees: private key   │
├──────────┬─────────────────┤
│ sign-tx  │  MCP Server     │
│ (local)  │  (remote)       │
│          │                 │
│ Signs tx │  prepare_*      │
│ locally  │  broadcast      │
│          │  query blocks   │
│ Key in   │  faucet         │
│ .env or  │  verify         │
│ keystore │  explorer       │
└──────────┴─────────────────┘
```

**Key principle:** The private key NEVER leaves your machine. MCP prepares unsigned transactions, signing happens locally, then the signed transaction is broadcast back through MCP.

## Quick Start: Subscription (Claude Code)

```bash
# Clone
git clone https://github.com/stakeme-team/pharos-agent-kit
cd pharos-agent-kit

# Install (in Docker for safety)
docker run --rm --network host -v "$(pwd):/app" -w /app node:20-alpine npm install

# Create wallet
npx tsx scripts/wallet-manager.ts generate --simple

# Open Claude Code
claude
```

Claude Code auto-detects `.mcp.json` and connects to Pharos. Use the built-in skills:

```
/wallet    — Get testnet tokens from faucet
/send      — Send tokens to a random address from a recent block
/deploy    — Deploy and verify a smart contract
```

Or just chat: *"Send 0.001 PHRS to a random address from the latest block"*

> See also: [Cursor setup](docs/cursor-setup.md) | [Codex setup](docs/codex-setup.md)

## Quick Start: AI SDK (Programmatic)

```bash
# Clone & install
git clone https://github.com/stakeme-team/pharos-agent-kit
cd pharos-agent-kit
docker run --rm --network host -v "$(pwd):/app" -w /app node:20-alpine npm install

# Configure
cp .env.example .env
npx tsx scripts/wallet-manager.ts generate --simple
# Edit .env: add ANTHROPIC_API_KEY or OPENAI_API_KEY

# Run demos
npm run demo:wallet    # Claim faucet tokens
npm run demo:send      # Send tokens to random address
npm run demo:deploy    # Deploy & verify contract
```

Switch between Claude and OpenAI:
```env
AI_PROVIDER=anthropic   # or openai
```

## Security

### Simple Mode (default)

Private key in `.env`, protected by guard hooks that block the agent from reading it.

```bash
npx tsx scripts/wallet-manager.ts generate --simple
```

Guard blocks 20+ attack vectors (tested):
```bash
npm run security-test
# ✓ cat .env           → BLOCKED
# ✓ grep PRIVATE .env  → BLOCKED
# ✓ echo $PRIVATE_KEY  → BLOCKED
# ✓ python3 read .env  → BLOCKED
# ... 26/26 passed ✓
```

### Secure Mode (signing daemon)

Private key encrypted in keystore, decrypted only in a separate daemon process. Agent physically cannot access the key.

```bash
# Create encrypted wallet
npx tsx scripts/wallet-manager.ts generate --secure

# Start daemon (separate terminal)
npx tsx scripts/signer-daemon.ts
# Unlock password: ********
# ✓ Signer ready: 0x742d...
# ✓ Socket: /tmp/pharos-signer.sock
```

```
┌───────────────────┐     ┌───────────────────┐
│  Agent            │     │  Signer Daemon     │
│  (no key access)  │────▶│  (key in memory)   │
│                   │unix │                    │
│  Gets: signed hex │◀────│  Signs tx          │
└───────────────────┘sock └───────────────────┘
```

#### Approval Modes

**Auto mode** (default) — signs transactions immediately:
```bash
npx tsx scripts/signer-daemon.ts
```

**Manual mode** — requires human approval for each transaction:
```bash
npx tsx scripts/signer-daemon.ts --manual
```

In manual mode, every signing request shows transaction details and waits for your approval. The agent (Claude) just waits until you decide:

```
  ⚠  Sign transaction?
     Type:    TRANSFER
     To:      0x5f98ce551fFbd3C5C6bA571e0F793F8ADE228F96
     Value:   0.01 (10000000000000000 wei)
     Gas:     25200

     Approve? [y/n]: y
     ✓ Signed: to=0x5f98ce... value=10000000000000000
```

If you reject (`n`), the agent receives an error and can inform you that the transaction was declined.

#### Password File (for Docker detached)

To run the daemon without interactive password input:

```bash
# Create password file
echo "your_password" > .keystore/.password
chmod 600 .keystore/.password

# Run detached
docker compose up -d signer

# Check logs
docker compose logs signer
```

### Docker Isolation

Protect against supply chain attacks in npm packages:

```bash
# Install deps in container (node_modules isolated)
docker compose run --rm install

# Run demos in container
docker compose run --rm dev npx tsx examples/01-wallet-and-faucet.ts

# Signer daemon with NO network access
docker compose up signer
```

## Project Structure

```
pharos-agent-kit/
├── CLAUDE.md                    # Agent instructions for Pharos
├── .mcp.json                    # Claude Code MCP config
├── .cursor/mcp.json             # Cursor MCP config
├── .codex/config.toml           # Codex MCP config (via mcp-remote)
│
├── .claude/
│   ├── settings.json            # Guard hook config
│   └── skills/
│       ├── wallet.md            # /wallet skill
│       ├── send.md              # /send skill
│       └── deploy.md            # /deploy skill
│
├── scripts/
│   ├── wallet-manager.ts        # Create/import wallet
│   ├── sign-tx.ts               # Sign tx (stdin → stdout)
│   ├── signer-daemon.ts         # Signing daemon (secure mode)
│   ├── guard.sh                 # Block agent from reading keys
│   └── security-test.ts         # Test guard (20+ attack vectors)
│
├── src/                         # AI SDK core library
│   ├── mcp-client.ts            # MCP client factory
│   ├── wallet.ts                # Wallet (address only for LLM)
│   ├── signing-bridge.ts        # Auto-sign prepare_* results
│   ├── agent.ts                 # Agent factory (Claude + OpenAI)
│   └── utils.ts                 # Helpers
│
├── examples/                    # AI SDK demos
│   ├── 01-wallet-and-faucet.ts
│   ├── 02-send-tokens.ts
│   └── 03-deploy-and-verify.ts
│
├── contracts/
│   ├── SimpleStorage.sol
│   └── compiled/SimpleStorage.json
│
├── docs/
│   ├── claude-code-setup.md
│   ├── cursor-setup.md
│   ├── codex-setup.md
│   └── prompts.md               # Ready-to-use prompts
│
├── Dockerfile
└── docker-compose.yml
```

## MCP Tools

The Pharos MCP server at `https://api.pharos.exploreme.pro/mcp` provides 69 tools:

| Category | Tools |
|----------|-------|
| Transactions | `prepare_native_transfer`, `prepare_erc20_transfer`, `prepare_transaction`, `broadcast_signed_raw_transaction`, `wait_for_transaction` |
| Balances | `get_balance`, `get_token_balance` |
| Blocks | `list_evm_blocks`, `get_evm_block_by_height` |
| Contracts | `read_evm_contract`, `verify_evm_contract_standard_json` |
| Tokens | `list_erc20_tokens`, `get_erc20_token_by_address` |
| Faucet | `claim_faucet_tokens`, `get_faucet_payout_status` |
| Explorer | `explorer_search`, `get_account_by_address` |

## Requirements

- Node.js 20+
- Docker (recommended for security)
- For subscription path: Claude Pro/Max, Cursor Pro, or ChatGPT Pro
- For AI SDK path: Anthropic or OpenAI API key

## License

MIT
