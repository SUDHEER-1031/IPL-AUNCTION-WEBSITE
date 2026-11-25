import dotenv from 'dotenv';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret === 'replace-with-a-strong-random-secret-in-production') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be set in production');
  }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET not set; using ephemeral development secret.');
}

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  dbPath: process.env.DB_PATH
    ? path.resolve(serverRoot, process.env.DB_PATH)
    : path.resolve(serverRoot, 'data', 'auction.db'),
  playersSeedPath: path.resolve(serverRoot, 'data', 'players.json'),
};
