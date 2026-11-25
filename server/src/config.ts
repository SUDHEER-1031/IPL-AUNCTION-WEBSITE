import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');

const dbPath = process.env.DB_PATH
  ? path.resolve(serverRoot, process.env.DB_PATH)
  : path.resolve(serverRoot, 'data', 'auction.db');

function resolveJwtSecret(): string {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret !== 'replace-with-a-strong-random-secret-in-production') {
    return envSecret;
  }

  // Persist a generated CSPRNG secret alongside the SQLite DB so restarts don't invalidate tokens
  const secretFile = path.join(path.dirname(dbPath), '.jwt_secret');
  try {
    if (fs.existsSync(secretFile)) {
      const stored = fs.readFileSync(secretFile, 'utf-8').trim();
      if (stored.length >= 32) return stored;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, generated, { mode: 0o600 });
    console.warn('[config] JWT_SECRET not set; generated and stored a random secret.');
    return generated;
  } catch {
    console.warn('[config] JWT_SECRET not set; using ephemeral random secret.');
    return crypto.randomBytes(32).toString('hex');
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: resolveJwtSecret(),
  corsOrigin: process.env.CORS_ORIGIN?.trim() || '',
  dbPath,
  playersSeedPath: path.resolve(serverRoot, 'data', 'players.json'),
};
