import { NextResponse } from 'next/server'
import { updateStreamState } from '@/lib/server-state'
import { getValidAuth, forceRefreshAuth, readCredentials } from '@/lib/twitch-auth'

export const dynamic = 'force-dynamic'

async function fetchStream(clientId: string, token: string, login: string) {
  return fetch(`https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(login)}`, {
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
}

export async function GET() {
  const credentials = readCredentials()
  if (!credentials) {
    return NextResponse.json({ error: 'Credentials fehlen in .env.local' }, { status: 500 })
  }

  // Gemeinsamer Refresh-Pfad mit dem EventSub-Listener: Twitch rotiert den
  // Refresh-Token, zwei parallele Refreshes würden sich gegenseitig entwerten.
  const auth = await getValidAuth()
  if (!auth?.accessToken) {
    return NextResponse.json({ error: 'Nicht authentifiziert — /setup öffnen' }, { status: 401 })
  }

  let res = await fetchStream(credentials.clientId, auth.accessToken, auth.channelLogin)

  if (res.status === 401) {
    const refreshed = await forceRefreshAuth()
    if (refreshed?.accessToken) {
      res = await fetchStream(credentials.clientId, refreshed.accessToken, refreshed.channelLogin)
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

  // Keep server-side stream state in sync (broadcastet an alle Overlays)
  updateStreamState({
    gameName: result.gameName,
    streamStartedAt: result.startedAt,
    viewerCount: result.viewerCount,
  })

  return NextResponse.json(result)
}
