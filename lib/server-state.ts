import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'overlay.db')

// ── Singleton connection (global to survive Next.js hot-reload) ───────────────
declare global {
  // eslint-disable-next-line no-var
  var __overlayDb: Database.Database | undefined
}

function db(): Database.Database {
  if (global.__overlayDb) return global.__overlayDb

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

  const conn = new Database(DB_FILE)
  conn.pragma('journal_mode = WAL')
  conn.pragma('foreign_keys = ON')

  conn.exec(`
    CREATE TABLE IF NOT EXISTS auth (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      access_token  TEXT    NOT NULL,
      refresh_token TEXT    NOT NULL,
      channel_login TEXT    NOT NULL,
      expires_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stream_state (
      id                      INTEGER PRIMARY KEY CHECK (id = 1),
      game_name               TEXT,
      stream_started_at       TEXT,
      viewer_count            INTEGER,
      last_follower           TEXT,
      last_subscriber         TEXT,
      last_bits_username      TEXT,
      last_bits_amount        INTEGER,
      last_donation_username  TEXT,
      last_donation_amount    TEXT,
      last_donation_currency  TEXT
    );

    INSERT OR IGNORE INTO stream_state (id) VALUES (1);
  `)

  global.__overlayDb = conn
  migrateJsonFiles(conn)
  return conn
}

// ── One-time migration from legacy JSON files ─────────────────────────────────
function migrateJsonFiles(conn: Database.Database): void {
  const authFile = path.join(DATA_DIR, 'auth.json')
  const stateFile = path.join(DATA_DIR, 'stream-state.json')

  if (fs.existsSync(authFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(authFile, 'utf-8'))
      if (raw.accessToken && raw.refreshToken && raw.channelLogin && raw.expiresAt) {
        conn
          .prepare(
            `INSERT OR IGNORE INTO auth (id, access_token, refresh_token, channel_login, expires_at)
             VALUES (1, ?, ?, ?, ?)`
          )
          .run(raw.accessToken, raw.refreshToken, raw.channelLogin, raw.expiresAt)
      }
    } catch {}
    fs.renameSync(authFile, authFile + '.migrated')
  }

  if (fs.existsSync(stateFile)) {
    try {
      const raw = JSON.parse(fs.readFileSync(stateFile, 'utf-8'))
      const sets: string[] = []
      const values: unknown[] = []
      if (raw.gameName) {
        sets.push('game_name = ?')
        values.push(raw.gameName)
      }
      if (raw.streamStartedAt) {
        sets.push('stream_started_at = ?')
        values.push(raw.streamStartedAt)
      }
      if (raw.viewerCount != null) {
        sets.push('viewer_count = ?')
        values.push(raw.viewerCount)
      }
      if (sets.length > 0) {
        conn.prepare(`UPDATE stream_state SET ${sets.join(', ')} WHERE id = 1`).run(...values)
      }
    } catch {}
    fs.renameSync(stateFile, stateFile + '.migrated')
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthData {
  accessToken: string
  refreshToken: string
  channelLogin: string
  expiresAt: number // unix ms
}

export function readAuth(): AuthData | null {
  const row = db()
    .prepare('SELECT access_token, refresh_token, channel_login, expires_at FROM auth WHERE id = 1')
    .get() as
    | { access_token: string; refresh_token: string; channel_login: string; expires_at: number }
    | undefined

  if (!row) return null
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    channelLogin: row.channel_login,
    expiresAt: row.expires_at,
  }
}

export function writeAuth(data: AuthData): void {
  db()
    .prepare(
      `INSERT INTO auth (id, access_token, refresh_token, channel_login, expires_at)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         access_token  = excluded.access_token,
         refresh_token = excluded.refresh_token,
         channel_login = excluded.channel_login,
         expires_at    = excluded.expires_at`
    )
    .run(data.accessToken, data.refreshToken, data.channelLogin, data.expiresAt)
}

export function clearAuth(): void {
  db().prepare('DELETE FROM auth WHERE id = 1').run()
}

// ── Stream State ──────────────────────────────────────────────────────────────

export interface LastBitsEvent {
  username: string
  amount: number
}

export interface LastDonationEvent {
  username: string
  amount: string
  currency: string
}

export interface StreamState {
  gameName: string | null
  streamStartedAt: string | null
  viewerCount: number | null
  lastFollower: string | null
  lastSubscriber: string | null
  lastBits: LastBitsEvent | null
  lastDonation: LastDonationEvent | null
}

type StateRow = {
  game_name: string | null
  stream_started_at: string | null
  viewer_count: number | null
  last_follower: string | null
  last_subscriber: string | null
  last_bits_username: string | null
  last_bits_amount: number | null
  last_donation_username: string | null
  last_donation_amount: string | null
  last_donation_currency: string | null
}

function rowToState(row: StateRow): StreamState {
  return {
    gameName: row.game_name,
    streamStartedAt: row.stream_started_at,
    viewerCount: row.viewer_count,
    lastFollower: row.last_follower,
    lastSubscriber: row.last_subscriber,
    lastBits:
      row.last_bits_username != null && row.last_bits_amount != null
        ? { username: row.last_bits_username, amount: row.last_bits_amount }
        : null,
    lastDonation:
      row.last_donation_username != null &&
      row.last_donation_amount != null &&
      row.last_donation_currency != null
        ? {
            username: row.last_donation_username,
            amount: row.last_donation_amount,
            currency: row.last_donation_currency,
          }
        : null,
  }
}

export function getStreamState(): StreamState {
  const row = db()
    .prepare(
      `SELECT game_name, stream_started_at, viewer_count,
              last_follower, last_subscriber,
              last_bits_username, last_bits_amount,
              last_donation_username, last_donation_amount, last_donation_currency
       FROM stream_state WHERE id = 1`
    )
    .get() as StateRow | undefined

  if (!row) {
    return {
      gameName: null,
      streamStartedAt: null,
      viewerCount: null,
      lastFollower: null,
      lastSubscriber: null,
      lastBits: null,
      lastDonation: null,
    }
  }
  return rowToState(row)
}

export function updateStreamState(patch: Partial<StreamState>): StreamState {
  const sets: string[] = []
  const values: unknown[] = []

  if (patch.gameName !== undefined) {
    sets.push('game_name = ?')
    values.push(patch.gameName)
  }
  if (patch.streamStartedAt !== undefined) {
    sets.push('stream_started_at = ?')
    values.push(patch.streamStartedAt)
  }
  if (patch.viewerCount !== undefined) {
    sets.push('viewer_count = ?')
    values.push(patch.viewerCount)
  }
  if (patch.lastFollower !== undefined) {
    sets.push('last_follower = ?')
    values.push(patch.lastFollower)
  }
  if (patch.lastSubscriber !== undefined) {
    sets.push('last_subscriber = ?')
    values.push(patch.lastSubscriber)
  }
  if (patch.lastBits !== undefined) {
    sets.push('last_bits_username = ?, last_bits_amount = ?')
    values.push(patch.lastBits?.username ?? null, patch.lastBits?.amount ?? null)
  }
  if (patch.lastDonation !== undefined) {
    sets.push('last_donation_username = ?, last_donation_amount = ?, last_donation_currency = ?')
    values.push(
      patch.lastDonation?.username ?? null,
      patch.lastDonation?.amount ?? null,
      patch.lastDonation?.currency ?? null
    )
  }

  if (sets.length > 0) {
    db()
      .prepare(`UPDATE stream_state SET ${sets.join(', ')} WHERE id = 1`)
      .run(...values)
  }

  return getStreamState()
}
