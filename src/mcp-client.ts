import { createMCPClient } from "@ai-sdk/mcp";
import { getMcpUrl } from "./utils.js";

let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

export async function getPharosMCPClient() {
  if (mcpClient) return mcpClient;

  const url = getMcpUrl();

  mcpClient = await createMCPClient({
    transport: {
      type: "sse",
      url,
    },
  });

  return mcpClient;
}

export async function getMCPTools(): Promise<Record<string, any>> {
  const client = await getPharosMCPClient();
  return client.tools();
}

export async function closeMCPClient() {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
  }
}
