import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import type { MemberRole } from './auctionLogic.js';

export interface MemberTokenPayload {
  memberId: string;
  roomCode: string;
  role: MemberRole;
  displayName: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signMemberToken(payload: MemberTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
}

export function verifyMemberToken(token: string): MemberTokenPayload {
  return jwt.verify(token, config.jwtSecret) as MemberTokenPayload;
}

// Wrong-password attempt limiter (per IP + roomCode)
interface AttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes lockout

const attemptMap = new Map<string, AttemptRecord>();

export function checkPasswordRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const record = attemptMap.get(key);
  if (!record) return { allowed: true };

  if (record.lockedUntil && record.lockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((record.lockedUntil - now) / 1000) };
  }

  if (now - record.firstAttemptAt > WINDOW_MS) {
    attemptMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedPasswordAttempt(key: string): { remainingAttempts: number; lockedUntil?: number } {
  const now = Date.now();
  const existing = attemptMap.get(key);

  if (!existing || now - existing.firstAttemptAt > WINDOW_MS) {
    attemptMap.set(key, { count: 1, firstAttemptAt: now });
    return { remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  existing.count += 1;
  if (existing.count >= MAX_ATTEMPTS) {
    existing.lockedUntil = now + LOCKOUT_MS;
    return { remainingAttempts: 0, lockedUntil: existing.lockedUntil };
  }
  return { remainingAttempts: Math.max(0, MAX_ATTEMPTS - existing.count) };
}

export function clearPasswordAttempts(key: string): void {
  attemptMap.delete(key);
}
