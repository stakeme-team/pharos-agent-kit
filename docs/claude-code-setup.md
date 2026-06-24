# Claude Code + Pharos MCP Setup

## Prerequisites

- [Claude Code](https://claude.ai/code) installed
- Claude Pro or Max subscription
- Node.js 20+

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/stakeme-team/pharos-agent-kit
cd pharos-agent-kit

# 2. Install dependencies
npm install

# 3. Create a wallet
npm run wallet:simple
# or for enhanced security:
npm run wallet:secure

# 4. Open Claude Code
claude
```

That's it! Claude Code automatically detects `.mcp.json` and connects to the Pharos MCP server.

## Usage

Once inside Claude Code, you can use the built-in skills:

```
/wallet    — Create wallet and get testnet tokens from faucet
/send      — Send tokens to a random address from a recent block
/deploy    — Deploy and verify a smart contract
```

Or just chat naturally:

```
"Check my wallet balance"
"Send 0.001 PHRS to a random address"
"Deploy the SimpleStorage contract and verify it"
```

## Security Modes

### Simple Mode (default)
Private key stored in `.env`, protected by guard hooks that block Claude from reading it.

```bash
npm run wallet:simple
```

### Secure Mode
Private key encrypted in keystore, signing daemon runs in separate process.

```bash
# Create encrypted wallet
npm run wallet:secure

# Start signing daemon (separate terminal)
npm run signer

# Then use Claude Code normally
claude
```

## Verify MCP Connection

Inside Claude Code, run `/mcp` to see connected MCP servers. You should see `pharos` listed with its tools.
