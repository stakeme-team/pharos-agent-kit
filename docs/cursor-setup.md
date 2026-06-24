# Cursor + Pharos MCP Setup

## Prerequisites

- [Cursor IDE](https://cursor.com) installed
- Cursor Pro subscription (for agent mode)
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

# 4. Open in Cursor
cursor .
```

Cursor automatically detects `.cursor/mcp.json` and connects to the Pharos MCP server.

## Usage

In Cursor's AI chat (Cmd+L), ask:

```
"Check my Pharos wallet balance"
"Send 0.001 tokens to a random address from a recent block"
"Deploy the SimpleStorage contract from contracts/ and verify it"
```

## Verify MCP Connection

Go to Settings > Developer > MCP to see connected servers. `pharos` should be listed.
