import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { getMCPTools, closeMCPClient } from "./mcp-client.js";
import { augmentToolsWithSigning } from "./signing-bridge.js";
import { getEnv, logStep } from "./utils.js";

function getModel() {
  const provider = getEnv("AI_PROVIDER", false) || "anthropic";

  if (provider === "openai") {
    const model = getEnv("OPENAI_MODEL", false) || "gpt-4o";
    return openai(model);
  }

  const model =
    getEnv("ANTHROPIC_MODEL", false) || "claude-sonnet-4-20250514";
  return anthropic(model);
}

export interface AgentOptions {
  systemPrompt: string;
  userPrompt: string;
  maxSteps?: number;
  verbose?: boolean;
}

export async function runAgent(options: AgentOptions) {
  const { systemPrompt, userPrompt, maxSteps = 15, verbose = true } = options;

  // Get MCP tools and augment with signing bridge
  const mcpTools = await getMCPTools();
  const tools = augmentToolsWithSigning(mcpTools);

  const model = getModel();

  if (verbose) {
    const provider = getEnv("AI_PROVIDER", false) || "anthropic";
    console.log(`\nProvider: ${provider}`);
    console.log(`Tools loaded: ${Object.keys(tools).length}`);
    console.log(`Max steps: ${maxSteps}`);
    console.log(`\n${"=".repeat(60)}\n`);
  }

  try {
    const result = await generateText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      tools: tools as any,
      maxSteps,
      onStepFinish: (step) => {
        if (verbose) {
          logStep(step as any);
        }
      },
    });

    if (verbose) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`\nFinal response:\n${result.text}`);
    }

    return result;
  } finally {
    await closeMCPClient();
  }
}
