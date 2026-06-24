import * as net from "net";
import * as fs from "fs";
import * as readline from "readline";
import { privateKeyToAccount } from "viem/accounts";
import type { Account } from "viem";
import { decryptKeystore } from "./keystore-utils.js";

const SOCKET_PATH = process.env.SIGNER_SOCKET || "/tmp/pharos-signer.sock";
const KEYSTORE_FILE = ".keystore/wallet.json";
const PASSWORD_FILE = process.env.PASSWORD_FILE || ".keystore/.password";
const SIGN_MODE = process.argv.includes("--manual") ? "manual" : "auto";

// --- Password prompt ---

async function promptTTY(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
    terminal: true,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// --- Main ---

async function main(): Promise<void> {
  // 1. Load keystore
  if (!fs.existsSync(KEYSTORE_FILE)) {
    console.error(`\u2717 Keystore not found: ${KEYSTORE_FILE}`);
    console.error(`  Run: npm run wallet:secure`);
    process.exit(1);
  }

  const keystore = JSON.parse(fs.readFileSync(KEYSTORE_FILE, "utf-8"));
  console.log(`Keystore loaded: ${keystore.address}`);

  // 2. Get password: --password-file flag > PASSWORD_FILE env > .keystore/.password file > TTY prompt
  let password: string | null = null;

  const passwordFileArg = process.argv.find((a) => a.startsWith("--password-file="));
  const passwordFilePath = passwordFileArg
    ? passwordFileArg.split("=")[1]
    : fs.existsSync(PASSWORD_FILE)
      ? PASSWORD_FILE
      : null;

  if (passwordFilePath) {
    if (!fs.existsSync(passwordFilePath)) {
      console.error(`\u2717 Password file not found: ${passwordFilePath}`);
      process.exit(1);
    }
    password = fs.readFileSync(passwordFilePath, "utf-8").trim();
    console.log(`Password loaded from: ${passwordFilePath}`);
  } else {
    password = await promptTTY("Unlock password: ");
  }

  // 3. Decrypt private key
  let privateKey: string;
  try {
    privateKey = decryptKeystore(keystore, password);
  } catch (e: any) {
    console.error(`\u2717 ${e.message}`);
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`\u2713 Signer ready: ${account.address}`);

  // Zero password from memory
  password = null;

  console.log(`Mode: ${SIGN_MODE === "manual" ? "MANUAL (requires approval)" : "AUTO (signs immediately)"}`);

  // 4. Clean up old socket
  if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
  }

  // 5. Start Unix socket server
  // allowHalfOpen: client calls end() after sending, but server still needs to write response
  const server = net.createServer({ allowHalfOpen: true }, (conn) => {
    let data = "";

    conn.on("data", (chunk) => {
      data += chunk.toString();
    });

    conn.on("end", async () => {
      try {
        const request = JSON.parse(data);
        const response = await handleRequest(request, account);
        conn.write(JSON.stringify(response));
      } catch (e: any) {
        conn.write(JSON.stringify({ ok: false, error: e.message }));
      }
      conn.end();
    });

    conn.on("error", () => {
      // Client disconnected, ignore
    });
  });

  server.listen(SOCKET_PATH, () => {
    fs.chmodSync(SOCKET_PATH, 0o600);
    console.log(`\u2713 Socket: ${SOCKET_PATH}`);
    console.log(`\nWaiting for signing requests... (Ctrl+C to stop)\n`);
  });

  // 6. Graceful shutdown
  const cleanup = () => {
    console.log("\nShutting down signer...");
    privateKey = "0x" + "0".repeat(64); // zero key
    server.close();
    if (fs.existsSync(SOCKET_PATH)) {
      fs.unlinkSync(SOCKET_PATH);
    }
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

// --- Manual approval prompt ---

function formatValue(weiStr: string | undefined): string {
  if (!weiStr || weiStr === "0") return "0";
  try {
    const wei = BigInt(weiStr);
    const eth = Number(wei) / 1e18;
    return `${eth} (${weiStr} wei)`;
  } catch {
    return weiStr;
  }
}

function logTransaction(tx: Record<string, any>): void {
  const isDeployment = !tx.to;
  const modeLabel = SIGN_MODE === "manual" ? "\u26a0  Sign transaction?" : "\u2192  Signing transaction";

  console.log(`\n  ${modeLabel}`);
  console.log(`     Type:    ${isDeployment ? "CONTRACT DEPLOY" : "TRANSFER"}`);
  if (tx.to) console.log(`     To:      ${tx.to}`);
  console.log(`     Value:   ${formatValue(tx.value)}`);
  if (tx.gas) console.log(`     Gas:     ${tx.gas}`);
  if (tx.data && tx.data.length > 10) {
    console.log(`     Data:    ${tx.data.substring(0, 20)}... (${(tx.data.length - 2) / 2} bytes)`);
  }
  console.log(`\n     Full TX JSON:`);
  console.log(`     ${JSON.stringify(tx, null, 2).split("\n").join("\n     ")}`);
}

async function askApproval(): Promise<boolean> {
  console.log();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return new Promise((resolve) => {
    rl.question("     Approve? [y/n]: ", (answer) => {
      rl.close();
      const approved = answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
      resolve(approved);
    });
  });
}

// --- Request handler ---

async function handleRequest(
  request: any,
  account: Account
): Promise<Record<string, unknown>> {
  const action = request.action;

  switch (action) {
    case "sign_transaction": {
      const tx = request.tx;
      if (!tx) {
        return { ok: false, error: "Missing tx field" };
      }

      // Log transaction details (both modes)
      logTransaction(tx);

      // Manual approval mode — wait for user confirmation
      if (SIGN_MODE === "manual") {
        const approved = await askApproval();
        if (!approved) {
          console.log("     \u2717 Rejected by user\n");
          return { ok: false, error: "Transaction rejected by user" };
        }
      }

      // Normalize transaction fields for viem
      const txData: Record<string, any> = {};

      if (tx.to) txData.to = tx.to;
      if (tx.value) txData.value = BigInt(tx.value);
      if (tx.data) txData.data = tx.data;
      if (tx.gas) txData.gas = BigInt(tx.gas);
      if (tx.gasLimit) txData.gas = BigInt(tx.gasLimit);
      if (tx.gasPrice) txData.gasPrice = BigInt(tx.gasPrice);
      if (tx.maxFeePerGas) txData.maxFeePerGas = BigInt(tx.maxFeePerGas);
      if (tx.maxPriorityFeePerGas)
        txData.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas);
      if (tx.nonce !== undefined) txData.nonce = Number(tx.nonce);
      if (tx.chainId) txData.chainId = Number(tx.chainId);

      const signFn = (account as any).signTransaction;
      if (!signFn) {
        return { ok: false, error: "Account does not support signTransaction" };
      }

      const signed = await signFn.call(account, txData);

      console.log(`     \u2713 Signed\n`);

      return { ok: true, signedTransaction: signed };
    }

    case "get_address": {
      return { ok: true, address: account.address };
    }

    case "get_private_key":
    case "export_key":
    case "export":
    case "dump": {
      console.warn(`  \u26a0 Blocked attempt to export private key`);
      return {
        ok: false,
        error: "Forbidden: private key never leaves the signer daemon",
      };
    }

    default: {
      return {
        ok: false,
        error: `Unknown action: ${action}. Supported: sign_transaction, get_address`,
      };
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
