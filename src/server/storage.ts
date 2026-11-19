import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import type { ParsedLivePlayer, ParsedTelemetryEvent } from './scpslConsole';

export interface StoredSanction {
  id: string;
  targetName: string;
  targetSteamId: string;
  type: 'BAN' | 'KICK' | 'WARN' | 'MUTE';
  reason: string;
  duration: string;
  moderator: string;
  source: string;
  timestamp: string;
  active: boolean;
}

export interface PersistedPanelState {
  staffList?: unknown[];
  sanctions?: StoredSanction[];
  customTeams?: unknown[];
  vipTiers?: unknown[];
  panelRoleMatrix?: unknown[];
  serverNameRich?: string;
  pastebinId?: string;
  discordInvite?: string;
  afficheSections?: unknown[];
  discordWebhookUrl?: string;
  pteroUrl?: string;
  pteroServerId?: string;
  serverPort?: string;
  updatedAt?: string;
}

interface LocalDiskStore {
  panelState: PersistedPanelState;
  telemetryEvents: ParsedTelemetryEvent[];
  players: Record<string, ParsedLivePlayer>;
}

const CONTAINER_ROOT = process.env.SCPSL_ROOT || '/home/container';
const HAS_CONTAINER = fs.existsSync(path.join(CONTAINER_ROOT, '.config'));
const LOCAL_DB_FILE = HAS_CONTAINER
  ? path.join(CONTAINER_ROOT, 'lumishost-suite', 'panel-db.json')
  : path.join(process.cwd(), 'data', 'panel-db.json');

let pool: mysql.Pool | null = null;
let mysqlSchemaReady = false;
let lastMysqlError: string | null = null;

function readMysqlEnvConfig() {
  return {
    host: (process.env.MYSQL_HOST || '').trim(),
    port: Number(process.env.MYSQL_PORT || 3306),
    database: (process.env.MYSQL_DATABASE || '').trim(),
    user: (process.env.MYSQL_USER || '').trim(),
    password: process.env.MYSQL_PASSWORD || ''
  };
}

export function isMysqlConfigured(): boolean {
  const cfg = readMysqlEnvConfig();
  return Boolean(cfg.host && cfg.database && cfg.user);
}

async function getMysqlPool(): Promise<mysql.Pool | null> {
  if (!isMysqlConfigured()) return null;
  if (!pool) {
    const cfg = readMysqlEnvConfig();
    pool = mysql.createPool({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 5000
    });
  }

  if (!mysqlSchemaReady) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS lumishost_kv (
          key_name VARCHAR(128) PRIMARY KEY,
          value_json LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS lumishost_sanctions (
          id VARCHAR(64) PRIMARY KEY,
          target_name VARCHAR(191) NOT NULL,
          target_steam_id VARCHAR(128) NOT NULL,
          sanction_type VARCHAR(32) NOT NULL,
          reason TEXT NOT NULL,
          duration VARCHAR(64) NOT NULL,
          moderator VARCHAR(191) NOT NULL,
          source VARCHAR(64) NOT NULL,
          timestamp_label VARCHAR(64) NOT NULL,
          active TINYINT(1) NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS lumishost_telemetry (
          id VARCHAR(64) PRIMARY KEY,
          timestamp_label VARCHAR(64) NOT NULL,
          category VARCHAR(32) NOT NULL,
          killer_name VARCHAR(191) NULL,
          killer_steam_id VARCHAR(128) NULL,
          killer_role VARCHAR(128) NULL,
          victim_name VARCHAR(191) NULL,
          victim_steam_id VARCHAR(128) NULL,
          victim_role VARCHAR(128) NULL,
          weapon VARCHAR(128) NULL,
          zone VARCHAR(128) NULL,
          details TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS lumishost_players (
          steam_id VARCHAR(128) PRIMARY KEY,
          username VARCHAR(191) NOT NULL,
          last_player_id INT NOT NULL DEFAULT 0,
          last_role VARCHAR(128) NOT NULL DEFAULT 'Joueur',
          is_online TINYINT(1) NOT NULL DEFAULT 0,
          last_seen_label VARCHAR(64) NOT NULL DEFAULT '',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      mysqlSchemaReady = true;
      lastMysqlError = null;
    } catch (err: unknown) {
      lastMysqlError = err instanceof Error ? err.message : 'Erreur initialisation schéma MySQL';
      return null;
    }
  }

  return pool;
}

function readLocalDisk(): LocalDiskStore {
  try {
    if (fs.existsSync(LOCAL_DB_FILE)) {
      const raw = fs.readFileSync(LOCAL_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LocalDiskStore>;
      return {
        panelState: parsed.panelState || {},
        telemetryEvents: Array.isArray(parsed.telemetryEvents) ? parsed.telemetryEvents : [],
        players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {}
      };
    }
  } catch {
    // fallback empty store
  }
  return { panelState: {}, telemetryEvents: [], players: {} };
}

function writeLocalDisk(store: LocalDiskStore): void {
  try {
    fs.mkdirSync(path.dirname(LOCAL_DB_FILE), { recursive: true });
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // ignore disk write error if read-only
  }
}

export async function loadPanelState(): Promise<{
  state: PersistedPanelState;
  storageEngine: 'mysql' | 'json';
}> {
  const local = readLocalDisk();
  const db = await getMysqlPool();

  if (db) {
    try {
      const [rows] = await db.query<mysql.RowDataPacket[]>(
        'SELECT value_json FROM lumishost_kv WHERE key_name = ?',
        ['panel_state']
      );
      const [sanctionRows] = await db.query<mysql.RowDataPacket[]>(
        'SELECT id, target_name, target_steam_id, sanction_type, reason, duration, moderator, source, timestamp_label, active FROM lumishost_sanctions ORDER BY created_at DESC LIMIT 250'
      );

      let state: PersistedPanelState = local.panelState || {};
      if (rows.length > 0 && rows[0].value_json) {
        state = { ...state, ...JSON.parse(String(rows[0].value_json)) };
      }

      if (sanctionRows.length > 0) {
        state.sanctions = sanctionRows.map((r) => ({
          id: String(r.id),
          targetName: String(r.target_name),
          targetSteamId: String(r.target_steam_id),
          type: String(r.sanction_type) as StoredSanction['type'],
          reason: String(r.reason),
          duration: String(r.duration),
          moderator: String(r.moderator),
          source: String(r.source),
          timestamp: String(r.timestamp_label),
          active: Boolean(r.active)
        }));
      }

      lastMysqlError = null;
      return { state, storageEngine: 'mysql' };
    } catch (err: unknown) {
      lastMysqlError = err instanceof Error ? err.message : 'Erreur lecture MySQL';
    }
  }

  return { state: local.panelState || {}, storageEngine: 'json' };
}

export async function savePanelState(patch: PersistedPanelState): Promise<{
  savedMysql: boolean;
  savedDisk: boolean;
  error?: string;
}> {
  const local = readLocalDisk();
  const merged: PersistedPanelState = {
    ...local.panelState,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  local.panelState = merged;
  writeLocalDisk(local);

  let savedMysql = false;
  const db = await getMysqlPool();
  if (db) {
    try {
      await db.query(
        'INSERT INTO lumishost_kv (key_name, value_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)',
        ['panel_state', JSON.stringify(merged)]
      );

      if (Array.isArray(patch.sanctions)) {
        for (const s of patch.sanctions.slice(0, 100)) {
          await db.query(
            `INSERT INTO lumishost_sanctions
              (id, target_name, target_steam_id, sanction_type, reason, duration, moderator, source, timestamp_label, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE active = VALUES(active), reason = VALUES(reason), duration = VALUES(duration)`,
            [
              s.id,
              s.targetName,
              s.targetSteamId,
              s.type,
              s.reason,
              s.duration,
              s.moderator,
              s.source,
              s.timestamp,
              s.active ? 1 : 0
            ]
          );
        }
      }

      savedMysql = true;
      lastMysqlError = null;
    } catch (err: unknown) {
      lastMysqlError = err instanceof Error ? err.message : 'Erreur écriture MySQL';
      return { savedMysql: false, savedDisk: true, error: lastMysqlError };
    }
  }

  return { savedMysql, savedDisk: true };
}

export async function saveSanctionRecord(record: StoredSanction): Promise<void> {
  const local = readLocalDisk();
  const existing = Array.isArray(local.panelState.sanctions) ? local.panelState.sanctions : [];
  const filtered = existing.filter((s) => s.id !== record.id);
  local.panelState.sanctions = [record, ...filtered].slice(0, 250);
  local.panelState.updatedAt = new Date().toISOString();
  writeLocalDisk(local);

  const db = await getMysqlPool();
  if (db) {
    try {
      await db.query(
        `INSERT INTO lumishost_sanctions
          (id, target_name, target_steam_id, sanction_type, reason, duration, moderator, source, timestamp_label, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE active = VALUES(active), reason = VALUES(reason), duration = VALUES(duration)`,
        [
          record.id,
          record.targetName,
          record.targetSteamId,
          record.type,
          record.reason,
          record.duration,
          record.moderator,
          record.source,
          record.timestamp,
          record.active ? 1 : 0
        ]
      );
      lastMysqlError = null;
    } catch (err: unknown) {
      lastMysqlError = err instanceof Error ? err.message : 'Erreur sauvegarde sanction MySQL';
    }
  }
}

export async function revokeSanctionBySteamId(steamId: string): Promise<void> {
  const clean = steamId.trim().toLowerCase();
  const local = readLocalDisk();
  if (Array.isArray(local.panelState.sanctions)) {
    local.panelState.sanctions = local.panelState.sanctions.map((s) =>
      s.targetSteamId.toLowerCase() === clean ? { ...s, active: false } : s
    );
    writeLocalDisk(local);
  }

  const db = await getMysqlPool();
  if (db) {
    try {
      await db.query(
        'UPDATE lumishost_sanctions SET active = 0 WHERE LOWER(target_steam_id) = ?',
        [clean]
      );
    } catch (err: unknown) {
      lastMysqlError = err instanceof Error ? err.message : 'Erreur révocation sanction MySQL';
    }
  }
}

export async function appendTelemetryEvents(events: ParsedTelemetryEvent[]): Promise<void> {
  if (!events.length) return;
  const local = readLocalDisk();
  const existingIds = new Set(local.telemetryEvents.map((e) => e.id));
  const fresh = events.filter((e) => !existingIds.has(e.id));
  if (fresh.length > 0) {
    local.telemetryEvents = [...fresh, ...local.telemetryEvents].slice(0, 300);
    writeLocalDisk(local);
  }

  const db = await getMysqlPool();
  if (db && fresh.length > 0) {
    try {
      for (const evt of fresh.slice(0, 50)) {
        await db.query(
          `INSERT IGNORE INTO lumishost_telemetry
            (id, timestamp_label, category, killer_name, killer_steam_id, killer_role, victim_name, victim_steam_id, victim_role, weapon, zone, details)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            evt.id.slice(0, 64),
            evt.timestamp.slice(0, 64),
            evt.category,
            evt.killerName || null,
            evt.killerSteamId || null,
            evt.killerRole || null,
            evt.victimName || null,
            evt.victimSteamId || null,
            evt.victimRole || null,
            evt.weapon || null,
            evt.zone || null,
            evt.details
          ]
        );
      }
      lastMysqlError = null;
    } catch (err: unknown) {
      lastMysqlError = err instanceof Error ? err.message : 'Erreur sauvegarde logs MySQL';
    }
  }
}

export async function loadTelemetryEvents(): Promise<ParsedTelemetryEvent[]> {
  const local = readLocalDisk();
  const db = await getMysqlPool();
  if (db) {
    try {
      const [rows] = await db.query<mysql.RowDataPacket[]>(
        'SELECT id, timestamp_label, category, killer_name, killer_steam_id, killer_role, victim_name, victim_steam_id, victim_role, weapon, zone, details FROM lumishost_telemetry ORDER BY created_at DESC LIMIT 200'
      );
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: String(r.id),
          timestamp: String(r.timestamp_label),
          category: String(r.category) as ParsedTelemetryEvent['category'],
          killerName: r.killer_name ? String(r.killer_name) : undefined,
          killerSteamId: r.killer_steam_id ? String(r.killer_steam_id) : undefined,
          killerRole: r.killer_role ? String(r.killer_role) : undefined,
          victimName: r.victim_name ? String(r.victim_name) : undefined,
          victimSteamId: r.victim_steam_id ? String(r.victim_steam_id) : undefined,
          victimRole: r.victim_role ? String(r.victim_role) : undefined,
          weapon: r.weapon ? String(r.weapon) : undefined,
          zone: r.zone ? String(r.zone) : undefined,
          details: String(r.details)
        }));
      }
    } catch (err: unknown) {
      lastMysqlError = err instanceof Error ? err.message : 'Erreur lecture télémétrie MySQL';
    }
  }
  return local.telemetryEvents;
}

export async function upsertPlayers(players: ParsedLivePlayer[]): Promise<void> {
  if (!players.length) return;
  const local = readLocalDisk();
  for (const p of players) {
    local.players[p.steamId] = p;
  }
  writeLocalDisk(local);

  const db = await getMysqlPool();
  if (db) {
    try {
      for (const p of players) {
        await db.query(
          `INSERT INTO lumishost_players (steam_id, username, last_player_id, last_role, is_online, last_seen_label)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE username = VALUES(username), last_player_id = VALUES(last_player_id), last_role = VALUES(last_role), is_online = VALUES(is_online), last_seen_label = VALUES(last_seen_label)`,
          [p.steamId, p.name, p.id, p.role, p.isOnline ? 1 : 0, p.lastSeen]
        );
      }
    } catch (err: unknown) {
      lastMysqlError = err instanceof Error ? err.message : 'Erreur sauvegarde joueurs MySQL';
    }
  }
}

export async function loadKnownPlayers(): Promise<ParsedLivePlayer[]> {
  const local = readLocalDisk();
  const db = await getMysqlPool();
  if (db) {
    try {
      const [rows] = await db.query<mysql.RowDataPacket[]>(
        'SELECT steam_id, username, last_player_id, last_role, is_online, last_seen_label FROM lumishost_players ORDER BY is_online DESC, updated_at DESC LIMIT 200'
      );
      if (rows.length > 0) {
        return rows.map((r) => ({
          id: Number(r.last_player_id || 0),
          name: String(r.username),
          steamId: String(r.steam_id),
          role: String(r.last_role || 'Joueur'),
          isOnline: Boolean(r.is_online),
          lastSeen: String(r.last_seen_label || '')
        }));
      }
    } catch {
      // fallback to disk
    }
  }
  return Object.values(local.players);
}

export async function getStorageStatus(): Promise<{
  mysqlConfigured: boolean;
  mysqlConnected: boolean;
  mysqlHost: string;
  mysqlDatabase: string;
  localDiskFile: string;
  error: string | null;
}> {
  const cfg = readMysqlEnvConfig();
  let mysqlConnected = false;
  if (isMysqlConfigured()) {
    const db = await getMysqlPool();
    if (db) {
      try {
        await db.query('SELECT 1');
        mysqlConnected = true;
        lastMysqlError = null;
      } catch (err: unknown) {
        lastMysqlError = err instanceof Error ? err.message : 'Connexion MySQL échouée';
      }
    }
  }
  return {
    mysqlConfigured: isMysqlConfigured(),
    mysqlConnected,
    mysqlHost: cfg.host ? `${cfg.host}:${cfg.port}` : 'Non configuré',
    mysqlDatabase: cfg.database || 'Non configurée',
    localDiskFile: LOCAL_DB_FILE,
    error: lastMysqlError
  };
}
