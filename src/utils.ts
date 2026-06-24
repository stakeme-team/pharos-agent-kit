import { config } from "dotenv";
import * as fs from "fs";

// Load .env
config();

export function getEnv(key: string, required = true): string {
  const value = process.env[key];
  if (required && !value) {
    console.error(`Missing required env variable: ${key}`);
    console.error(`Copy .env.example to .env and fill in the values.`);
    process.exit(1);
  }
  return value || "";
}

export function getWalletAddress(): string {
  return getEnv("WALLET_ADDRESS");
}

export function getMcpUrl(): string {
  return getEnv(
    "PHAROS_MCP_URL",
    false
  ) || "https://api.pharos.exploreme.pro/mcp";
}

export function getSignerMode(): "simple" | "secure" {
  const mode = getEnv("SIGNER_MODE", false) || "simple";
  return mode as "simple" | "secure";
}

// Step logger for agent execution
export function logStep(step: {
  stepType: string;
  text?: string;
  toolCalls?: Array<{ toolName: string; args: Record<string, unknown> }>;
  toolResults?: Array<{ toolName: string; result: unknown }>;
}): void {
  if (step.toolCalls && step.toolCalls.length > 0) {
    for (const call of step.toolCalls) {
      console.log(`\n\u2192 Tool: ${call.toolName}`);
      const argsStr = JSON.stringify(call.args, null, 2);
      if (argsStr.length < 500) {
        console.log(`  Args: ${argsStr}`);
      } else {
        console.log(`  Args: ${argsStr.substring(0, 500)}...`);
      }
    }
  }

  if (step.toolResults && step.toolResults.length > 0) {
    for (const result of step.toolResults) {
      const resultStr =
        typeof result.result === "string"
          ? result.result
          : JSON.stringify(result.result, null, 2);
      if (resultStr.length < 500) {
        console.log(`  Result: ${resultStr}`);
      } else {
        console.log(`  Result: ${resultStr.substring(0, 500)}...`);
      }
    }
  }

  if (step.text) {
    console.log(`\n\ud83d\udcac ${step.text}`);
  }
}
