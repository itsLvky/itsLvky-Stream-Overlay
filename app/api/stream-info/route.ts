import { NextResponse } from 'next/server'
import { readAuth, writeAuth, updateStreamState } from '@/lib/server-state'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/auth/twitch/callback`

async function doRefresh(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })
  if (!res.ok) return null
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

async function fetchStream(clientId: string, token: string, login: string) {
  return fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}`, {
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
}

export async function GET() {
  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Credentials fehlen in .env.local' }, { status: 500 })
  }

  const auth = readAuth()
  if (!auth?.accessToken) {
    return NextResponse.json({ error: 'Nicht authentifiziert — /setup öffnen' }, { status: 401 })
  }

  let { accessToken, refreshToken, channelLogin } = auth
  let res = await fetchStream(clientId, accessToken, channelLogin)

  // Token abgelaufen → refresh
  if (res.status === 401 && refreshToken) {
    const refreshed = await doRefresh(clientId, clientSecret, refreshToken)
    if (refreshed) {
      accessToken = refreshed.access_token
      refreshToken = refreshed.refresh_token
      writeAuth({
        ...auth,
        accessToken,
        refreshToken,
        expiresAt: Date.now() + refreshed.expires_in * 1000,
      })
      res = await fetchStream(clientId, accessToken, channelLogin)
    }
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Twitch API: ${res.status} ${res.statusText}` },
      { status: res.status }
    )
  }

  const stream = (await res.json()).data?.[0] ?? null

  const result = {
    live: !!stream,
    startedAt: stream?.started_at ?? null,
    viewerCount: stream?.viewer_count ?? null,
    title: stream?.title ?? null,
    gameName: stream?.game_name ?? null,
  }

  // Keep server-side stream state in sync
  updateStreamState({
    gameName: result.gameName,
    streamStartedAt: result.startedAt,
    viewerCount: result.viewerCount,
  })

  return NextResponse.json(result)
}
