---
name: send
description: Send native tokens to a random address from a recent block
---

# /send — Send Tokens

## Steps

1. Get wallet address:
   ```bash
   grep WALLET_ADDRESS .env | cut -d'=' -f2
   ```

2. Check balance using MCP `get_balance`. If insufficient, suggest running `/wallet` first.

3. Find a recipient address:
   - Call MCP `list_evm_blocks` with `limit: 1` to get the latest block
   - Call MCP `get_evm_block_by_height` with the block height to get transactions
   - Pick a random address from the block's transactions (a `from` or `to` address)
   - If no transactions found, try an earlier block

4. Prepare the transfer:
   - Call MCP `prepare_native_transfer` with:
     - `from`: wallet address
     - `to`: recipient address from step 3
     - `amount`: "0.001" (small test amount)

5. Sign the transaction:
   ```bash
   echo '<unsigned_tx_json_from_step_4>' | npx tsx scripts/sign-tx.ts
   ```
   Capture the signed hex output.

6. Broadcast:
   - Call MCP `broadcast_signed_raw_transaction` with `serializedTransaction` = signed hex

7. Wait for confirmation:
   - Call MCP `wait_for_transaction` with the tx hash

8. Show receipt:
   - Call MCP `get_transaction_receipt` with the tx hash
   - Report: tx hash, from, to, amount, gas used, status

## SECURITY
- NEVER read PRIVATE_KEY — use sign-tx.ts for signing
- NEVER access .env except for WALLET_ADDRESS
