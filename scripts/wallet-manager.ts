import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { encryptKeystore } from "./keystore-utils.js";

const KEYSTORE_DIR = path.resolve(".keystore");
const KEYSTORE_FILE = path.join(KEYSTORE_DIR, "wallet.json");
const ENV_FILE = path.resolve(".env");

// --- Password prompt ---

async function promptPassword(message: string): Promise<string> {
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

// --- .env file helpers ---

function updateEnvFile(key: string, value: string): void {
  let content = "";
  if (fs.existsSync(ENV_FILE)) {
    content = fs.readFileSync(ENV_FILE, "utf-8");
  }

  const regex = new RegExp(`^${key}=.*$`, "m");
  const line = `${key}=${value}`;

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + "\n" + line + "\n";
  }

  fs.writeFileSync(ENV_FILE, content);
}

// --- Commands ---

async function generateSimple(): Promise<void> {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  updateEnvFile("WALLET_ADDRESS", account.address);
  updateEnvFile("PRIVATE_KEY", privateKey);
  updateEnvFile("SIGNER_MODE", "simple");

  console.log(`\u2713 Wallet created: ${account.address}`);
  console.log(`\u2713 Saved to .env (WALLET_ADDRESS + PRIVATE_KEY)`);
  console.log(`\u2713 Mode: simple`);
  console.log(``);
  console.log(`Next: npm run demo:wallet (to get testnet tokens)`);
}

async function generateSecure(): Promise<void> {
  let privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  const password = await promptPassword("Enter password for keystore: ");
  const confirmPassword = await promptPassword("Confirm password: ");

  if (password !== confirmPassword) {
    console.error("\u2717 Passwords do not match");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("\u2717 Password must be at least 8 characters");
    process.exit(1);
  }

  // Create encrypted keystore
  const keystore = encryptKeystore(privateKey, password);

  if (!fs.existsSync(KEYSTORE_DIR)) {
    fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
  }

  fs.writeFileSync(KEYSTORE_FILE, JSON.stringify(keystore, null, 2));
  fs.chmodSync(KEYSTORE_FILE, 0o600); // owner read/write only

  // Save only address to .env (NOT the private key)
  updateEnvFile("WALLET_ADDRESS", account.address);
  updateEnvFile("SIGNER_MODE", "secure");

  // Remove PRIVATE_KEY from .env if it exists
  if (fs.existsSync(ENV_FILE)) {
    let content = fs.readFileSync(ENV_FILE, "utf-8");
    content = content.replace(/^PRIVATE_KEY=.*\n?/m, "");
    fs.writeFileSync(ENV_FILE, content);
  }

  // Zero out private key from memory
  privateKey = `0x${"0".repeat(64)}` as `0x${string}`;

  console.log(`\u2713 Wallet created: ${account.address}`);
  console.log(`\u2713 Keystore saved: ${KEYSTORE_FILE} (encrypted)`);
  console.log(`\u2713 Mode: secure (private key NOT in .env)`);
  console.log(``);
  console.log(`Next: npm run signer (to start signing daemon)`);
}

async function importKey(key: string, mode: string): Promise<void> {
  if (!key.startsWith("0x") || key.length !== 66) {
    console.error("\u2717 Invalid private key format. Must be 0x... (66 chars)");
    process.exit(1);
  }

  const account = privateKeyToAccount(key as `0x${string}`);

  if (mode === "secure") {
    const password = await promptPassword("Enter password for keystore: ");
    const confirmPassword = await promptPassword("Confirm password: ");

    if (password !== confirmPassword) {
      console.error("\u2717 Passwords do not match");
      process.exit(1);
    }

    const keystore = encryptKeystore(key, password);

    if (!fs.existsSync(KEYSTORE_DIR)) {
      fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
    }

    fs.writeFileSync(KEYSTORE_FILE, JSON.stringify(keystore, null, 2));
    fs.chmodSync(KEYSTORE_FILE, 0o600);

    updateEnvFile("WALLET_ADDRESS", account.address);
    updateEnvFile("SIGNER_MODE", "secure");

    console.log(`\u2713 Wallet imported: ${account.address}`);
    console.log(`\u2713 Keystore saved: ${KEYSTORE_FILE} (encrypted)`);
  } else {
    updateEnvFile("WALLET_ADDRESS", account.address);
    updateEnvFile("PRIVATE_KEY", key);
    updateEnvFile("SIGNER_MODE", "simple");

    console.log(`\u2713 Wallet imported: ${account.address}`);
    console.log(`\u2713 Saved to .env`);
  }
}

// --- CLI ---

const args = process.argv.slice(2);
const command = args[0];

if (command === "generate") {
  const mode = args.includes("--secure") ? "secure" : "simple";
  if (mode === "secure") {
    await generateSecure();
  } else {
    await generateSimple();
  }
} else if (command === "import") {
  const key = args[1];
  if (!key) {
    console.error("Usage: wallet-manager import <0xPRIVATE_KEY> [--secure]");
    process.exit(1);
  }
  const mode = args.includes("--secure") ? "secure" : "simple";
  await importKey(key, mode);
} else {
  console.log(`Pharos Wallet Manager

Usage:
  wallet-manager generate [--simple|--secure]   Create a new wallet
  wallet-manager import <0xKEY> [--secure]       Import existing wallet

Modes:
  --simple   Store private key in .env (guarded by hooks)
  --secure   Encrypt in keystore, use signing daemon
`);
}
