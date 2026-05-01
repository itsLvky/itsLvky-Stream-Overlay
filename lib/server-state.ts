import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const AUTH_FILE = path.join(DATA_DIR, 'auth.json')
const STATE_FILE = path.join(DATA_DIR, 'stream-state.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthData {
  accessToken: string
  refreshToken: string
  channelLogin: string
  expiresAt: number // unix ms
}

export function readAuth(): AuthData | null {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as AuthData
  } catch {
    return null
  }
}

export function writeAuth(data: AuthData): void {
  ensureDir()
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2))
}

export function clearAuth(): void {
  try {
    fs.unlinkSync(AUTH_FILE)
  } catch {}
}

// ── Stream State ──────────────────────────────────────────────────────────────

export interface StreamState {
  gameName: string | null
  streamStartedAt: string | null
  viewerCount: number | null
}

const EMPTY: StreamState = { gameName: null, streamStartedAt: null, viewerCount: null }

// In-process singleton — loaded once from disk, then kept in memory
let _state: StreamState = (() => {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'))
    return { ...EMPTY, ...raw } as StreamState
  } catch {
    return { ...EMPTY }
  }
})()

export function getStreamState(): StreamState {
  return _state
}

export function updateStreamState(patch: Partial<StreamState>): StreamState {
  _state = { ..._state, ...patch }
  ensureDir()
  // Non-blocking write
  fs.writeFile(STATE_FILE, JSON.stringify(_state, null, 2), () => {})
  return _state
}
