import * as net from "net";
import * as fs from "fs";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "dotenv";

config();

const SOCKET_PATH = process.env.SIGNER_SOCKET || "/tmp/pharos-signer.sock";
const SIGNER_MODE = process.env.SIGNER_MODE || "simple";

// --- Read unsigned tx from stdin ---

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

// --- Sign via daemon (secure mode) ---

async function signViaDaemon(tx: Record<string, unknown>): Promise<string> {
  if (!fs.existsSync(SOCKET_PATH)) {
    process.stderr.write(
      `Error: Signer daemon not running. Start it: npm run signer\n`
    );
    process.exit(1);
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(SOCKET_PATH);

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
      } catch (e: any) {
        reject(new Error(`Invalid daemon response: ${data}`));
      }
    });

    socket.on("error", (err) => {
      reject(new Error(`Cannot connect to signer daemon: ${err.message}`));
    });
  });
}

// --- Sign locally (simple mode) ---

async function signLocally(tx: Record<string, unknown>): Promise<string> {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    process.stderr.write(`Error: PRIVATE_KEY not set in .env\n`);
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Normalize fields for viem
  const txData: Record<string, any> = {};
  if (tx.to) txData.to = tx.to;
  if (tx.value) txData.value = BigInt(tx.value as string);
  if (tx.data) txData.data = tx.data;
  if (tx.gas) txData.gas = BigInt(tx.gas as string);
  if (tx.gasLimit) txData.gas = BigInt(tx.gasLimit as string);
  if (tx.gasPrice) txData.gasPrice = BigInt(tx.gasPrice as string);
  if (tx.maxFeePerGas)
    txData.maxFeePerGas = BigInt(tx.maxFeePerGas as string);
  if (tx.maxPriorityFeePerGas)
    txData.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas as string);
  if (tx.nonce !== undefined) txData.nonce = Number(tx.nonce);
  if (tx.chainId) txData.chainId = Number(tx.chainId);

  const signed = await account.signTransaction(txData);
  return signed;
}

// --- Main ---

async function main(): Promise<void> {
  const input = await readStdin();

  if (!input) {
    process.stderr.write(
      `Usage: echo '{"to":"0x...","value":"1000",...}' | npx tsx scripts/sign-tx.ts\n`
    );
    process.exit(1);
  }

  let tx: Record<string, unknown>;
  try {
    tx = JSON.parse(input);
  } catch {
    process.stderr.write(`Error: Invalid JSON input\n`);
    process.exit(1);
  }

  let signed: string;

  if (SIGNER_MODE === "secure") {
    signed = await signViaDaemon(tx);
  } else {
    signed = await signLocally(tx);
  }

  // Output ONLY the signed hex — nothing else
  process.stdout.write(signed);
}

main().catch((e) => {
  process.stderr.write(`Error: ${e.message}\n`);
  process.exit(1);
});
