import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import type { Player } from './auctionLogic.js';

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
    db = new DatabaseSync(config.dbPath);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    initSchema(db);
    seedPlayers(db);
  }
  return db;
}

function initSchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      host_member_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'LOBBY',
      timer_seconds INTEGER NOT NULL DEFAULT 10,
      current_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL,
      display_name TEXT NOT NULL,
      team_id TEXT,
      role TEXT NOT NULL,
      is_connected INTEGER NOT NULL DEFAULT 0,
      is_kicked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS teams_state (
      room_code TEXT NOT NULL,
      team_id TEXT NOT NULL,
      purse_lakhs INTEGER NOT NULL,
      squad_count INTEGER NOT NULL DEFAULT 0,
      overseas_count INTEGER NOT NULL DEFAULT 0,
      power_card_used INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (room_code, team_id),
      FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      photo TEXT NOT NULL,
      role TEXT NOT NULL,
      nationality TEXT NOT NULL,
      is_overseas INTEGER NOT NULL,
      base_price_lakhs INTEGER NOT NULL,
      stats_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_players (
      room_code TEXT NOT NULL,
      player_id TEXT NOT NULL,
      global_order INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      set_name TEXT NOT NULL,
      order_in_set INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'UPCOMING',
      sold_price_lakhs INTEGER,
      sold_to_team_id TEXT,
      is_accelerated INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (room_code, player_id),
      FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      player_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      amount_lakhs INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS watchlist (
      room_code TEXT NOT NULL,
      member_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      PRIMARY KEY (room_code, member_id, player_id),
      FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      member_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      team_id TEXT,
      message TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room_code) REFERENCES rooms(code) ON DELETE CASCADE
    );
  `);
}

function seedPlayers(database: DatabaseSync): void {
  const raw = fs.readFileSync(config.playersSeedPath, 'utf-8');
  const players = JSON.parse(raw) as Player[];
  const stmt = database.prepare(`
    INSERT INTO players (id, name, photo, role, nationality, is_overseas, base_price_lakhs, stats_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      photo = excluded.photo,
      role = excluded.role,
      nationality = excluded.nationality,
      is_overseas = excluded.is_overseas,
      base_price_lakhs = excluded.base_price_lakhs,
      stats_json = excluded.stats_json
  `);

  database.exec('BEGIN');
  try {
    for (const p of players) {
      stmt.run(
        p.id,
        p.name,
        p.photo,
        p.role,
        p.nationality,
        p.isOverseas ? 1 : 0,
        p.basePriceLakhs,
        JSON.stringify(p.stats),
      );
    }
    database.exec('COMMIT');
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  }
}

export function loadAllPlayers(): Player[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM players ORDER BY id').all() as Array<{
    id: string;
    name: string;
    photo: string;
    role: Player['role'];
    nationality: string;
    is_overseas: number;
    base_price_lakhs: number;
    stats_json: string;
  }>;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    photo: r.photo,
    role: r.role,
    nationality: r.nationality,
    isOverseas: r.is_overseas === 1,
    basePriceLakhs: r.base_price_lakhs,
    stats: JSON.parse(r.stats_json),
  }));
}
