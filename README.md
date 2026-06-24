<div align="center">

<img src="assets/pharos-logomark.svg" alt="Pharos" width="96" height="96">

# Pharos Agent Kit

**All-in-one MCP toolkit for the [Pharos](https://pharos.exploreme.pro) blockchain — in TypeScript.**

Wallet operations · local-only signing · native & ERC-20 transfers · staking · contract deploy & verify · faucet · full chain exploration — from **Claude Code**, **Cursor**, **Codex**, or directly via the **Vercel AI SDK**.

Built for **humans**. Perfect for **AI**.

[![MCP](https://img.shields.io/badge/MCP-server-6E56CF?logo=modelcontextprotocol&logoColor=white)](https://modelcontextprotocol.io)
[![Pharos](https://img.shields.io/badge/Pharos-Mainnet%20·%20chainId%201672-0A0BFF)](https://pharos.exploreme.pro)
[![Explorer](https://img.shields.io/badge/explorer-exploreme.pro-2D6CDF)](https://pharos.exploreme.pro)
[![License](https://img.shields.io/badge/License-MIT-2da44e)](#license)

[![Node](https://img.shields.io/badge/Node-%E2%89%A520-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![viem](https://img.shields.io/badge/EVM-viem-FFC517?logo=ethereum&logoColor=black)](https://viem.sh)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](#docker-isolation)

**Works with** &nbsp;
[![Claude Code](https://img.shields.io/badge/Claude_Code-D97757?logo=anthropic&logoColor=white)](docs/claude-code-setup.md)
[![Cursor](https://img.shields.io/badge/Cursor-000000?logo=cursor&logoColor=white)](docs/cursor-setup.md)
[![Codex](https://img.shields.io/badge/Codex-412991)](docs/codex-setup.md)
[![Vercel AI SDK](https://img.shields.io/badge/AI_SDK-000000?logo=vercel&logoColor=white)](#quick-start--ai-sdk-programmatic)

</div>

---

## Why Pharos Agent Kit

**Everything in one workspace.** Check balances, send transactions, deploy and verify
contracts, stake, and explore blocks, tokens and accounts — without switching between
the explorer and wallet UIs. The agent does the clicking; you stay in chat.

**Your private key never leaves your machine.** MCP only prepares *unsigned*
transactions — signing happens locally with [viem](https://viem.sh), and the key is
never sent to the AI model or a remote server.

**Two protection levels.**
- **Simple** — a guard hook blocks the agent from reading `.env`.
- **Secure** — an encrypted keystore + a signing daemon in a separate, isolated process; the agent only ever receives the signed transaction.

**Two ways to use.**
- **Subscription** (free) — connect MCP to Claude Code / Cursor / Codex and use your existing subscription.
- **AI SDK** (developers) — programmatic agents via the Vercel AI SDK with Claude or OpenAI.

> ⚠️ **Mainnet — real funds.** This kit targets the **Pharos mainnet** (`chainId 1672`,
> native token **PROS**) behind the [Exploreme](https://pharos.exploreme.pro) explorer &
> API. `/send` and `/deploy` move **real PROS** — fund your address from an exchange or
> bridge. Prefer **secure mode with manual approval** (`npm run signer -- --manual`) so
> every signature needs your explicit `y/n`. The faucet tools are testnet-only.

---

## Architecture

```
┌─────────────────────────────────┐
│  You (chat or code)             │
├─────────────────────────────────┤
│  AI Agent (Claude / GPT)        │
│                                 │
│  Sees: wallet address,          │
│        MCP tool results         │
│  Never sees: private key        │
├───────────────┬─────────────────┤
│ local signing │  MCP Server     │
│ (your machine)│  (remote)       │
│               │                 │
│  viem         │  prepare_*      │
│               │  broadcast      │
│  Key in .env  │  query / stake  │
│  or keystore  │  deploy / verify│
└───────────────┴─────────────────┘
```

**Key principle:** the private key NEVER leaves your machine. MCP prepares the
unsigned tx → you sign locally → the signed tx is broadcast back through MCP.

---

## Quick Start — Claude Code (subscription)

```bash
# Clone
git clone https://github.com/stakeme-team/pharos-agent-kit
cd pharos-agent-kit

# Install
npm install

# Create a wallet (outputs only the public address)
npm run wallet:simple

# Open Claude Code
claude
```

Claude Code auto-detects `.mcp.json` and connects to the Pharos MCP server. Then
just chat:

> *"Show my PROS balance, then send 0.001 PROS to 0x5f98ce551fFbd3C5C6bA571e0F793F8ADE228F96 and wait for the receipt."*

> See also: [Claude Code setup](docs/claude-code-setup.md) · [Cursor setup](docs/cursor-setup.md) · [Codex setup](docs/codex-setup.md) · [ready-made prompts](docs/prompts.md)

---

## Quick Start — AI SDK (programmatic)

```bash
git clone https://github.com/stakeme-team/pharos-agent-kit
cd pharos-agent-kit
npm install

cp .env.example .env
npm run wallet:simple
# Edit .env: add ANTHROPIC_API_KEY or OPENAI_API_KEY

npm run demo:wallet    # show wallet address & PROS balance
npm run demo:send      # send PROS to your own address (safe self-send)
npm run demo:deploy    # deploy & verify an EVM contract
```

Switch model provider in `.env`:

```env
AI_PROVIDER=anthropic   # or openai
```

---

## Skills

Built-in Claude Code / Cursor skills (slash commands):

| Skill | What it does |
|-------|--------------|
| `/wallet` | Set up a wallet and show your address & PROS balance |
| `/send` | Send PROS to a recipient address you specify |
| `/deploy` | Deploy **and** verify an EVM smart contract |

---

## Security

### Simple mode (default)

Private key in `.env`, protected by a guard hook that blocks the agent from reading it.

```bash
npm run wallet:simple
npm run security-test
# ✓ cat .env            → BLOCKED
# ✓ grep PRIVATE .env   → BLOCKED
# ✓ echo $PRIVATE_KEY   → BLOCKED
# ✓ python3 read .env   → BLOCKED
# ... 27/27 passed ✓
```

### Secure mode (signing daemon)

Private key encrypted in a keystore, decrypted only inside a separate daemon
process. The agent physically cannot reach the key — it only ever gets the signed
hex back.

```bash
# Create an encrypted wallet
npm run wallet:secure

# Start the daemon (separate terminal)
npm run signer              # auto-approve
npm run signer -- --manual  # ask y/n per transaction
```

```
┌───────────────────┐     ┌────────────────────┐
│  Agent            │     │  Signer Daemon      │
│  (no key access)  │────▶│  (key in memory)    │
│                   │unix │  viem               │
│  Gets: signed hex │◀────│  signs tx           │
└───────────────────┘sock └────────────────────┘
```

In `--manual` mode every signing request prints the tx details and waits for your
`y/n`:

```
  ⚠  Sign transaction?
     Type:    TRANSFER
     To:      0x5f98ce551fFbd3C5C6bA571e0F793F8ADE228F96
     Value:   0.01 PROS (10000000000000000 wei)
     Gas:     25200

     Approve? [y/n]: y
     ✓ Signed
```

If you reject (`n`), the agent receives an error and tells you the transaction was declined.

### Docker isolation

Guard against supply-chain attacks in npm packages and run the signer with no
network access:

```bash
docker compose run --rm install                  # install deps in a container
docker compose run --rm dev npx tsx examples/01-wallet-and-faucet.ts
docker compose up signer                          # signer daemon, NO network access
```

---

## MCP Tools

The Pharos MCP server at `https://api.pharos.exploreme.pro/mcp` exposes 85+ tools —
mostly read queries across the chain, plus the write tools that prepare and broadcast
transactions:

| Category | Tools |
|----------|-------|
| **Transactions** (write) | `prepare_native_transfer`, `prepare_erc20_transfer`, `prepare_erc721_transfer`, `prepare_erc1155_transfer`, `prepare_token_approval`, `prepare_contract_write`, `prepare_transaction`, `broadcast_signed_raw_transaction`, `wait_for_transaction` |
| **Staking** (write) | `prepare_delegate`, `prepare_undelegate`, `prepare_add_stake`, `prepare_withdraw_stake`, `prepare_claim_stake`, `prepare_claim_reward`, `prepare_compound_rewards` |
| **Balances / accounts** | `get_balance`, `get_token_balance`, `get_evm_account_by_address`, `get_account_token_summary`, `get_account_token_holdings`, `get_account_transactions`, `get_account_token_transfers` |
| **Blocks / transactions** | `list_evm_blocks`, `get_evm_block_by_height`, `list_evm_transactions`, `get_evm_transaction_by_hash`, `get_transaction_receipt`, `get_evm_transaction_logs` |
| **Contracts** | `read_evm_contract`, `get_evm_contract_code`, `get_evm_compiler_versions`, `verify_evm_contract_standard_json`, `verify_evm_contract_flattened`, `verify_evm_contract_multi_part` |
| **Tokens / NFTs** | `list_erc20_tokens`, `get_erc20_token_by_address`, `list_erc721_tokens`, `list_erc1155_tokens`, `get_erc721_token_holders`, `get_nft_info` |
| **Validators / staking data** | `list_validators`, `get_validator_by_address`, `get_staking_stats`, `get_account_delegations`, `get_top_delegators` |
| **Faucet** (testnet only) | `claim_faucet_tokens`, `get_faucet_payout_status` |
| **Explorer / chain** | `explorer_search`, `get_chain_network`, `get_gas_price`, `get_evm_gas_tracker`, `get_supported_networks` |

---

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
│   └── skills/                  # /wallet · /send · /deploy
│
├── scripts/
│   ├── wallet-manager.ts        # Create / import wallet (safe — address only)
│   ├── sign-tx.ts               # Sign tx (stdin JSON → stdout signed hex)
│   ├── signer-daemon.ts         # Signing daemon (secure mode)
│   ├── keystore-utils.ts        # Encrypted keystore helpers
│   ├── guard.sh                 # Block agent from reading keys
│   └── security-test.ts         # Test the guard (attack vectors)
│
├── src/                         # AI SDK core library
│   ├── mcp-client.ts            # MCP client factory
│   ├── wallet.ts                # Local signing (simple / secure)
│   ├── signing-bridge.ts        # Auto-sign prepare_* results
│   ├── agent.ts                 # Agent factory (Claude + OpenAI)
│   ├── index.ts                 # Library entry point
│   └── utils.ts                 # Env, MCP result parsing, helpers
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
├── docs/                        # setup guides + prompts
├── Dockerfile
└── docker-compose.yml
```

---

## Requirements

- **Node.js 20+** and **npm**
- **Docker** — optional, recommended for supply-chain-isolated installs and the network-less signer
- **Subscription path:** Claude Pro/Max, Cursor Pro, or ChatGPT Pro
- **AI SDK path:** an Anthropic or OpenAI API key

---

## License

MIT

---

<div align="center">

<img src="assets/pharos-logomark.svg" alt="Pharos" height="30">

<sub>Built by <a href="https://github.com/stakeme-team">Stakeme</a> · explorer at <a href="https://pharos.exploreme.pro">pharos.exploreme.pro</a></sub>

</div>
