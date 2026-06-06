import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'overlay.db')

// ── Singleton connection (global to survive Next.js hot-reload) ───────────────
declare global {
  // eslint-disable-next-line no-var
  var __overlayDb: Database.Database | undefined
  // eslint-disable-next-line no-var
  var __overlayDbMigrated: boolean | undefined
}

// Columns added after the initial schema — applied once per process.
const COLUMN_MIGRATIONS = [
  `ALTER TABLE stream_state ADD COLUMN last_redemption_username TEXT`,
  `ALTER TABLE stream_state ADD COLUMN last_redemption_title TEXT`,
  `ALTER TABLE settings ADD COLUMN banner_enabled INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE settings ADD COLUMN banner_items TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE settings ADD COLUMN banner_interval INTEGER NOT NULL DEFAULT 30`,
  `ALTER TABLE settings ADD COLUMN banner_duration INTEGER NOT NULL DEFAULT 8`,
  `ALTER TABLE settings ADD COLUMN banner_position TEXT NOT NULL DEFAULT 'middle'`,
]

function applyColumnMigrations(conn: Database.Database) {
  if (global.__overlayDbMigrated) return
  for (const sql of COLUMN_MIGRATIONS) {
    try {
      conn.exec(sql)
    } catch {
      /* column already exists */
    }
  }
  global.__overlayDbMigrated = true
}

function db(): Database.Database {
  if (global.__overlayDb) {
    applyColumnMigrations(global.__overlayDb)
    return global.__overlayDb
  }

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
      last_donation_currency  TEXT,
      last_redemption_username TEXT,
      last_redemption_title   TEXT
    );

    INSERT OR IGNORE INTO stream_state (id) VALUES (1);

    CREATE TABLE IF NOT EXISTS settings (
      id                      INTEGER PRIMARY KEY CHECK (id = 1),
      show_dauerwerbesendung  INTEGER NOT NULL DEFAULT 0
    );

    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `)

  applyColumnMigrations(conn)
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

export interface LastRedemptionEvent {
  username: string
  title: string
}

export interface StreamState {
  gameName: string | null
  streamStartedAt: string | null
  viewerCount: number | null
  lastFollower: string | null
  lastSubscriber: string | null
  lastBits: LastBitsEvent | null
  lastDonation: LastDonationEvent | null
  lastRedemption: LastRedemptionEvent | null
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
  last_redemption_username: string | null
  last_redemption_title: string | null
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
    lastRedemption:
      row.last_redemption_username != null && row.last_redemption_title != null
        ? { username: row.last_redemption_username, title: row.last_redemption_title }
        : null,
  }
}

export function getStreamState(): StreamState {
  const row = db()
    .prepare(
      `SELECT game_name, stream_started_at, viewer_count,
              last_follower, last_subscriber,
              last_bits_username, last_bits_amount,
              last_donation_username, last_donation_amount, last_donation_currency,
              last_redemption_username, last_redemption_title
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
      lastRedemption: null,
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
  if (patch.lastRedemption !== undefined) {
    sets.push('last_redemption_username = ?, last_redemption_title = ?')
    values.push(patch.lastRedemption?.username ?? null, patch.lastRedemption?.title ?? null)
  }

  if (sets.length > 0) {
    db()
      .prepare(`UPDATE stream_state SET ${sets.join(', ')} WHERE id = 1`)
      .run(...values)
  }

  return getStreamState()
}

// ── Settings ──────────────────────────────────────────────────────────────────

export interface BannerItem {
  text: string
  subtitle: string // optional secondary line shown below text
  icon: string // platform key ('twitch','discord','x','instagram','tiktok','youtube','kick') or emoji
  color: string // hex/css accent color
}

export interface Settings {
  showDauerwerbesendung: boolean
  bannerEnabled: boolean
  bannerItems: BannerItem[]
  bannerInterval: number
  bannerDuration: number
  bannerPosition: 'top' | 'middle' | 'bottom'
}

type SettingsRow = {
  show_dauerwerbesendung: number
  banner_enabled: number | null
  banner_items: string | null
  banner_interval: number | null
  banner_duration: number | null
  banner_position: string | null
}

function parseBannerItems(raw: string | null): BannerItem[] {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item): BannerItem => {
        if (typeof item === 'string')
          return { text: item, subtitle: '', icon: '', color: '#9146FF' }
        return {
          text: String(item.text ?? ''),
          subtitle: String(item.subtitle ?? ''),
          icon: String(item.icon ?? ''),
          color: String(item.color ?? '#9146FF'),
        }
      })
      .filter((item) => item.text.trim().length > 0)
  } catch {
    return []
  }
}

export function readSettings(): Settings {
  const row = db()
    .prepare(
      'SELECT show_dauerwerbesendung, banner_enabled, banner_items, banner_interval, banner_duration, banner_position FROM settings WHERE id = 1'
    )
    .get() as SettingsRow | undefined

  return {
    showDauerwerbesendung: row ? row.show_dauerwerbesendung === 1 : false,
    bannerEnabled: row?.banner_enabled !== 0,
    bannerItems: parseBannerItems(row?.banner_items ?? null),
    bannerInterval: row?.banner_interval ?? 30,
    bannerDuration: row?.banner_duration ?? 8,
    bannerPosition: (row?.banner_position as 'top' | 'middle' | 'bottom') ?? 'middle',
  }
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const sets: string[] = []
  const values: unknown[] = []

  if (patch.showDauerwerbesendung !== undefined) {
    sets.push('show_dauerwerbesendung = ?')
    values.push(patch.showDauerwerbesendung ? 1 : 0)
  }
  if (patch.bannerEnabled !== undefined) {
    sets.push('banner_enabled = ?')
    values.push(patch.bannerEnabled ? 1 : 0)
  }
  if (patch.bannerItems !== undefined) {
    const clean = patch.bannerItems.filter((i) => i.text.trim().length > 0)
    sets.push('banner_items = ?')
    values.push(JSON.stringify(clean))
  }
  if (patch.bannerInterval !== undefined) {
    sets.push('banner_interval = ?')
    values.push(Math.max(5, Number(patch.bannerInterval) || 30))
  }
  if (patch.bannerDuration !== undefined) {
    sets.push('banner_duration = ?')
    values.push(Math.max(2, Number(patch.bannerDuration) || 8))
  }
  if (patch.bannerPosition !== undefined) {
    sets.push('banner_position = ?')
    values.push(patch.bannerPosition)
  }

  if (sets.length > 0) {
    db()
      .prepare(`UPDATE settings SET ${sets.join(', ')} WHERE id = 1`)
      .run(...values)
  }
  return readSettings()
}
