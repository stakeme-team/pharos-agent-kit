---
name: wallet
description: Set up a wallet and show your address and PROS balance on Pharos
---

# /wallet — Wallet Setup & Balance

> Pharos mainnet (chainId 1672) uses **real PROS**. There is no mainnet faucet —
> fund your address from an exchange or bridge. The faucet steps below are
> **testnet-only**.

## Steps

1. Check if .env exists and has a wallet:
   ```bash
   grep WALLET_ADDRESS .env | cut -d'=' -f2
   ```

2. If no wallet address found (empty output or file not found):
   a. Check if node/npx is available:
      ```bash
      node --version
      ```
   b. If node is available, create wallet automatically:
      ```bash
      npx tsx scripts/wallet-manager.ts generate --simple
      ```
      This is SAFE — outputs ONLY the address, never the private key.
   c. If node is NOT available, tell the user:
      > Please install Node.js 20+ first: https://nodejs.org
      > Or use Docker: `docker compose run --rm dev npx tsx scripts/wallet-manager.ts generate --simple`
      Then stop.
   d. After creation, read the new address:
      ```bash
      grep WALLET_ADDRESS .env | cut -d'=' -f2
      ```

3. Get the wallet address from the output above.

4. Check current balance using MCP tool `get_balance` with the wallet address.

5. Report the address and PROS balance to the user (convert from wei to PROS).

6. If the balance is 0 or low:
   - **Mainnet:** tell the user to fund this address with real PROS from an
     exchange or bridge. Do NOT call the faucet — it does not work on mainnet.
   - **Testnet only:** you may claim from the faucet:
     - Call MCP `claim_faucet_tokens` with `address` = wallet address
     - Note the `requestId` from the response
     - Poll MCP `get_faucet_payout_status` with the `requestId`; if not
       "completed", wait a few seconds and poll again (max 10 attempts)
     - Call `get_balance` again and report the final balance

## SECURITY
- NEVER read PRIVATE_KEY from .env
- NEVER use `generate_disposable_test_wallet` MCP tool
- ONLY read WALLET_ADDRESS from .env
- wallet-manager generate is SAFE — it never outputs the private key
