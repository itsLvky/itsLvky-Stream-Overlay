import { readAuth, writeAuth, type AuthData } from './server-state'

// Vor dem Ablauf erneuern, statt auf den ersten 401 zu warten — der EventSub-
// Listener läuft stundenlang durch und soll dabei nicht einmal kurz taub werden.
const REFRESH_MARGIN_MS = 5 * 60_000

export interface TwitchCredentials {
  clientId: string
  clientSecret: string
}

export function readCredentials(): TwitchCredentials | null {
  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

async function requestRefresh(
  credentials: TwitchCredentials,
  auth: AuthData
): Promise<AuthData | null> {
  if (!auth.refreshToken) return null

  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    console.error('[twitch-auth] Refresh fehlgeschlagen:', res.status, await res.text())
    return null
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  const updated: AuthData = {
    ...auth,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  writeAuth(updated)
  return updated
}

/** Gültiges Token — erneuert automatisch, wenn es bald abläuft. */
export async function getValidAuth(): Promise<AuthData | null> {
  const auth = readAuth()
  if (!auth?.accessToken) return null
  if (auth.expiresAt - REFRESH_MARGIN_MS > Date.now()) return auth

  const credentials = readCredentials()
  if (!credentials) return auth

  return (await requestRefresh(credentials, auth)) ?? auth
}

/** Erzwungener Refresh, z.B. nachdem die Helix-API 401 geliefert hat. */
export async function forceRefreshAuth(): Promise<AuthData | null> {
  const auth = readAuth()
  const credentials = readCredentials()
  if (!auth || !credentials) return null
  return requestRefresh(credentials, auth)
}
