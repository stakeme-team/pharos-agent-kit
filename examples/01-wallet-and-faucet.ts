/**
 * Demo 1: Wallet & Balance
 *
 * Shows your wallet address and PROS balance on the Pharos mainnet
 * (chainId 1672, native token PROS).
 *
 * Mainnet uses REAL PROS — fund your address from an exchange or bridge.
 * The faucet tools (claim_faucet_tokens / get_faucet_payout_status) are
 * testnet-only. On a Pharos testnet you can ask the agent to:
 *   "Claim testnet tokens from the faucet and poll get_faucet_payout_status
 *    until complete, then show my balance."
 *
 * Prerequisites:
 *   npm run wallet:simple   (create wallet)
 *
 * Run:
 *   npm run demo:wallet
 *   # or via Docker:
 *   docker compose run dev npx tsx examples/01-wallet-and-faucet.ts
 */

import { runAgent } from "../src/agent.js";
import { getWalletAddress } from "../src/utils.js";

const walletAddress = getWalletAddress();

const systemPrompt = `You are a blockchain assistant for the Pharos network (mainnet, chainId 1672, native token PROS).
You have access to MCP tools for interacting with the Pharos blockchain.

The user's wallet address is: ${walletAddress}

IMPORTANT SECURITY RULES:
- NEVER attempt to read private keys or .env files
- NEVER use generate_disposable_test_wallet tool
- Use ONLY the provided wallet address

Your task is to report the user's wallet address and PROS balance.`;

const userPrompt = `Please do the following:
1. Check my wallet balance using get_balance with my address
2. Report my address and PROS balance in a clear, human-readable way (convert from wei to PROS)
3. If the balance is 0, remind me that Pharos mainnet uses real PROS and I should fund this address from an exchange or bridge`;

console.log("=== Pharos Agent Kit: Wallet & Balance Demo ===");
console.log(`Wallet: ${walletAddress}`);

await runAgent({
  systemPrompt,
  userPrompt,
  maxSteps: 20,
});
