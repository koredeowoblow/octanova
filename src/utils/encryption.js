import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const SECRET_KEY = process.env.COLD_STORAGE_SECRET; // Use environment variable
const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16; // AES IV length

export const encryptPrivateKey = (privateKey) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, "hex"), iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted; // Store IV with encrypted key
};

export const decryptPrivateKey = (encryptedPrivateKey) => {
  const parts = encryptedPrivateKey.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedText = parts.join(":");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, "hex"), iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
