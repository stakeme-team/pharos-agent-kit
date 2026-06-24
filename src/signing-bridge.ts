// Using 'any' for tool types since MCP tools use inputSchema (not parameters)
import { signTransaction, getAddress } from "./wallet.js";

// Tools that return unsigned transactions needing signing
const PREPARE_TOOLS = [
  "prepare_native_transfer",
  "prepare_transaction",
  "prepare_erc20_transfer",
  "prepare_erc721_transfer",
  "prepare_erc1155_transfer",
  "prepare_token_approval",
  "prepare_contract_write",
  // Staking
  "prepare_delegate",
  "prepare_undelegate",
  "prepare_add_stake",
  "prepare_withdraw_stake",
  "prepare_claim_stake",
  "prepare_claim_reward",
  "prepare_compound_rewards",
];

/**
 * Wraps MCP tools with signing bridge.
 * When agent calls prepare_*, the bridge:
 * 1. Calls the real MCP tool to get unsigned tx
 * 2. Signs it locally (or via daemon)
 * 3. Returns both unsigned tx AND signedTransaction to the agent
 *
 * The agent (LLM) NEVER sees the private key.
 */
export function augmentToolsWithSigning(
  tools: Record<string, any>
): Record<string, any> {
  const augmented = { ...tools };

  for (const toolName of PREPARE_TOOLS) {
    if (augmented[toolName]) {
      const original = augmented[toolName] as any;
      const originalExecute = original.execute;

      if (!originalExecute) continue;

      augmented[toolName] = {
        ...original,
        execute: async (args: any, options: any) => {
          // Call original MCP tool
          const result = await originalExecute(args, options);

          // Parse the unsigned tx from result
          let unsigned: Record<string, unknown>;
          try {
            unsigned =
              typeof result === "string" ? JSON.parse(result) : result;
          } catch {
            // If we can't parse, return as-is
            return result;
          }

          // Sign the transaction
          try {
            const signedTransaction = await signTransaction(unsigned);
            // Return enriched result — agent sees unsigned + signed
            const enriched = {
              ...unsigned,
              signedTransaction,
              _note:
                "Transaction signed locally. Use signedTransaction with broadcast_signed_raw_transaction.",
            };
            return JSON.stringify(enriched);
          } catch (e: any) {
            // If signing fails, return original + error
            return JSON.stringify({
              ...unsigned,
              _signingError: e.message,
              _note:
                "Signing failed. Check wallet setup: npm run wallet:simple",
            });
          }
        },
      };
    }
  }

  // Add a helper tool so the agent can get the wallet address
  augmented["get_wallet_address"] = {
    description: "Get the local wallet address (no private key exposure)",
    parameters: { type: "object" as const, properties: {} },
    execute: async () => {
      return JSON.stringify({ address: getAddress() });
    },
  } as any;

  return augmented;
}
