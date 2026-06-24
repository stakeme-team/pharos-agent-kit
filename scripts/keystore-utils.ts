import * as crypto from "crypto";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Encrypt a private key into Ethereum V3 keystore format
 */
export function encryptKeystore(
  privateKey: string,
  password: string
): Record<string, unknown> {
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const id = crypto.randomUUID();

  // Derive key using scrypt
  const derivedKey = crypto.scryptSync(password, salt, 32, {
    N: 8192,
    r: 8,
    p: 1,
  });

  // Encrypt private key with AES-128-CTR
  const cipher = crypto.createCipheriv(
    "aes-128-ctr",
    derivedKey.subarray(0, 16),
    iv
  );
  const keyBytes = Buffer.from(privateKey.replace("0x", ""), "hex");
  const ciphertext = Buffer.concat([cipher.update(keyBytes), cipher.final()]);

  // MAC = sha256(derivedKey[16:32] + ciphertext)
  const macData = Buffer.concat([derivedKey.subarray(16, 32), ciphertext]);
  const mac = crypto.createHash("sha256").update(macData).digest();

  return {
    version: 3,
    id,
    address: privateKeyToAccount(privateKey as `0x${string}`).address.toLowerCase(),
    crypto: {
      cipher: "aes-128-ctr",
      cipherparams: { iv: iv.toString("hex") },
      ciphertext: ciphertext.toString("hex"),
      kdf: "scrypt",
      kdfparams: {
        n: 8192,
        r: 8,
        p: 1,
        dklen: 32,
        salt: salt.toString("hex"),
      },
      mac: mac.toString("hex"),
    },
  };
}

/**
 * Decrypt an Ethereum V3 keystore to get the private key
 */
export function decryptKeystore(
  keystore: Record<string, any>,
  password: string
): `0x${string}` {
  const kdfparams = keystore.crypto.kdfparams;
  const salt = Buffer.from(kdfparams.salt, "hex");

  const derivedKey = crypto.scryptSync(password, salt, kdfparams.dklen, {
    N: kdfparams.n,
    r: kdfparams.r,
    p: kdfparams.p,
  });

  // Verify MAC
  const ciphertext = Buffer.from(keystore.crypto.ciphertext, "hex");
  const macData = Buffer.concat([derivedKey.subarray(16, 32), ciphertext]);
  const mac = crypto.createHash("sha256").update(macData).digest();

  if (mac.toString("hex") !== keystore.crypto.mac) {
    throw new Error("Wrong password: MAC verification failed");
  }

  // Decrypt
  const iv = Buffer.from(keystore.crypto.cipherparams.iv, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-128-ctr",
    derivedKey.subarray(0, 16),
    iv
  );
  const privateKeyBytes = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return `0x${privateKeyBytes.toString("hex")}`;
}
