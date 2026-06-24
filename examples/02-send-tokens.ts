/**
 * Demo 2: Send Tokens (safe self-send)
 *
 * Sends a tiny amount of PROS to your OWN address to demonstrate the full
 * prepare -> sign -> broadcast -> confirm flow without sending funds to anyone
 * else. On mainnet this costs only a little gas. To send to someone else, change
 * the recipient below to their address.
 *
 * Prerequisites:
 *   npm run wallet:simple   (create wallet)
 *   fund your address with PROS (mainnet uses real PROS — see the /wallet skill)
 *
 * Run:
 *   npm run demo:send
 *   # or via Docker:
 *   docker compose run dev npx tsx examples/02-send-tokens.ts
 */

import { runAgent } from "../src/agent.js";
import { getWalletAddress } from "../src/utils.js";

const walletAddress = getWalletAddress();

// Recipient for the demo. Defaults to a safe self-send; set DEMO_SEND_TO to
// send to a different address instead.
const recipient = process.env.DEMO_SEND_TO || walletAddress;

const systemPrompt = `You are a blockchain assistant for the Pharos network (mainnet, chainId 1672, native token PROS).
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
1. Check my wallet balance (get_balance). If it's 0, tell me to fund my address with PROS first.
2. Send 0.001 PROS to ${recipient}:
   - Call prepare_native_transfer with from=${walletAddress}, to=${recipient}, amount="0.001"
   - The result will include "signedTransaction" — use it with broadcast_signed_raw_transaction
3. Wait for the transaction to confirm (wait_for_transaction)
4. Get the receipt (get_transaction_receipt) and report the details`;

console.log("=== Pharos Agent Kit: Send Tokens Demo ===");
console.log(`Wallet:    ${walletAddress}`);
console.log(`Recipient: ${recipient}${recipient === walletAddress ? " (self-send)" : ""}`);

await runAgent({
  systemPrompt,
  userPrompt,
  maxSteps: 20,
});
