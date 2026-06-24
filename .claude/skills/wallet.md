---
name: wallet
description: Create wallet and claim testnet tokens from faucet
---

# /wallet — Wallet Setup & Faucet

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

5. If balance is 0 or low, claim faucet tokens:
   - Call MCP `claim_faucet_tokens` with `address` = wallet address
   - Note the `requestId` from the response

6. Poll faucet status:
   - Call MCP `get_faucet_payout_status` with the `requestId`
   - If status is not "completed", wait a few seconds and poll again (max 10 attempts)

7. Verify final balance:
   - Call MCP `get_balance` with the wallet address
   - Report the balance to the user

## SECURITY
- NEVER read PRIVATE_KEY from .env
- NEVER use `generate_disposable_test_wallet` MCP tool
- ONLY read WALLET_ADDRESS from .env
- wallet-manager generate is SAFE — it never outputs the private key
