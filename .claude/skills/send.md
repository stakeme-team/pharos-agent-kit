---
name: send
description: Send PROS to a recipient address and confirm the receipt
---

# /send — Send PROS

> Pharos mainnet uses **real PROS**. Send only to an address you intend, and confirm
> the recipient and amount before broadcasting.

## Steps

1. Get wallet address:
   ```bash
   grep WALLET_ADDRESS .env | cut -d'=' -f2
   ```

2. Determine the recipient and amount:
   - Use the recipient address and amount the user provides.
   - If the user did not specify a recipient, ask for one.
   - Only on a **testnet** may you pick a random `from`/`to` address from a recent
     block (`list_evm_blocks` + `get_evm_block_by_height`). NEVER do this on mainnet —
     it sends real funds to a stranger.

3. Check balance using MCP `get_balance`. If insufficient, tell the user to fund the
   address (mainnet: from an exchange or bridge) or run `/wallet`.

4. Prepare the transfer:
   - Call MCP `prepare_native_transfer` with:
     - `from`: wallet address
     - `to`: recipient address from step 2
     - `amount`: the amount to send (e.g. "0.001")

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
