import { privateKeyToAccount } from "viem/accounts";
import * as net from "net";
import { getEnv, getSignerMode } from "./utils.js";

const SOCKET_PATH = process.env.SIGNER_SOCKET || "/tmp/pharos-signer.sock";

/**
 * Get wallet address (safe — no private key exposure)
 */
export function getAddress(): string {
  return getEnv("WALLET_ADDRESS");
}

/**
 * Sign a transaction locally (simple mode) or via daemon (secure mode)
 * Returns serialized signed transaction hex
 */
export async function signTransaction(
  unsignedTx: Record<string, unknown>
): Promise<string> {
  const mode = getSignerMode();

  if (mode === "secure") {
    return signViaDaemon(unsignedTx);
  } else {
    return signLocally(unsignedTx);
  }
}

async function signLocally(
  tx: Record<string, unknown>
): Promise<string> {
  const privateKey = getEnv("PRIVATE_KEY");
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const txData = normalizeTx(tx);
  const signed = await account.signTransaction(txData);
  return signed;
}

async function signViaDaemon(
  tx: Record<string, unknown>
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(SOCKET_PATH);

    socket.on("error", (err) => {
      reject(
        new Error(
          `Cannot connect to signer daemon at ${SOCKET_PATH}. Start it: npm run signer\n${err.message}`
        )
      );
    });

    socket.write(JSON.stringify({ action: "sign_transaction", tx }));
    socket.end();

    let data = "";
    socket.on("data", (chunk) => {
      data += chunk.toString();
    });

    socket.on("end", () => {
      try {
        const response = JSON.parse(data);
        if (response.ok) {
          resolve(response.signedTransaction);
        } else {
          reject(new Error(response.error));
        }
      } catch {
        reject(new Error(`Invalid daemon response: ${data}`));
      }
    });
  });
}

function normalizeTx(tx: Record<string, unknown>): Record<string, any> {
  const result: Record<string, any> = {};

  if (tx.to) result.to = tx.to;
  if (tx.value) result.value = BigInt(tx.value as string);
  if (tx.data) result.data = tx.data;
  if (tx.gas) result.gas = BigInt(tx.gas as string);
  if (tx.gasLimit) result.gas = BigInt(tx.gasLimit as string);
  if (tx.gasPrice) result.gasPrice = BigInt(tx.gasPrice as string);
  if (tx.maxFeePerGas)
    result.maxFeePerGas = BigInt(tx.maxFeePerGas as string);
  if (tx.maxPriorityFeePerGas)
    result.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas as string);
  if (tx.nonce !== undefined) result.nonce = Number(tx.nonce);
  if (tx.chainId) result.chainId = Number(tx.chainId);

  return result;
}
