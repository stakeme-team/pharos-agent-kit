/**
 * Demo 2: Send Tokens
 *
 * Sends a small amount of native tokens to a random address
 * found in a recent block.
 *
 * Prerequisites:
 *   npm run wallet:simple   (create wallet)
 *   npm run demo:wallet     (get testnet tokens)
 *
 * Run:
 *   npm run demo:send
 *   # or via Docker:
 *   docker compose run dev npx tsx examples/02-send-tokens.ts
 */

import { runAgent } from "../src/agent.js";
import { getWalletAddress } from "../src/utils.js";

const walletAddress = getWalletAddress();

const systemPrompt = `You are a blockchain assistant for the Pharos network.
You have access to MCP tools for interacting with the Pharos blockchain.

The user's wallet address is: ${walletAddress}

TRANSACTION SIGNING:
When you call prepare_native_transfer or prepare_transaction, the signing bridge
automatically signs the transaction. The result will include a "signedTransaction" field.
Use that with broadcast_signed_raw_transaction to send the transaction.

IMPORTANT SECURITY RULES:
- NEVER attempt to read private keys or .env files
- NEVER use generate_disposable_test_wallet tool
- Transactions are signed automatically by the signing bridge`;

const userPrompt = `Please do the following:
1. Check my wallet balance (get_balance). If it's 0, tell me to run demo:wallet first.
2. Get the latest blocks (list_evm_blocks with limit 3)
3. Pick a recent block and get its details (get_evm_block_by_height) to find transaction addresses
4. Choose a random address from the block's transactions as the recipient
5. Send 0.001 native tokens to that address:
   - Call prepare_native_transfer with from=${walletAddress}, to=<recipient>, amount="0.001"
   - The result will include "signedTransaction" — use it with broadcast_signed_raw_transaction
6. Wait for the transaction to confirm (wait_for_transaction)
7. Get the receipt (get_transaction_receipt) and report the details`;

console.log("=== Pharos Agent Kit: Send Tokens Demo ===");
console.log(`Wallet: ${walletAddress}`);

await runAgent({
  systemPrompt,
  userPrompt,
  maxSteps: 20,
});
