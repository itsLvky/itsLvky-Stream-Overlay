import { NextRequest, NextResponse } from 'next/server'
import { readAuth, writeAuth } from '@/lib/server-state'

export const dynamic = 'force-dynamic'

// Subscription types required by the overlay (all v1 except channel.follow v2)
const SUBSCRIPTIONS: Array<{ type: string; version: string; needsModerator?: boolean }> = [
  { type: 'channel.follow', version: '2', needsModerator: true },
  { type: 'channel.cheer', version: '1' },
  { type: 'channel.subscribe', version: '1' },
  { type: 'channel.subscription.message', version: '1' },
  { type: 'channel.subscription.gift', version: '1' },
  { type: 'channel.channel_points_custom_reward_redemption.add', version: '1' },
]

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

async function createSubscription(
  clientId: string,
  accessToken: string,
  sessionId: string,
  type: string,
  version: string,
  broadcasterId: string,
  needsModerator: boolean
): Promise<{ ok: boolean; status: number }> {
  const condition: Record<string, string> = { broadcaster_user_id: broadcasterId }
  if (needsModerator) {
    // channel.follow v2 requires a moderator_user_id — use the broadcaster themselves
    condition.moderator_user_id = broadcasterId
  }

  const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type,
      version,
      condition,
      transport: { method: 'websocket', session_id: sessionId },
    }),
  })
  return { ok: res.ok || res.status === 409 /* already subscribed */, status: res.status }
}

export async function POST(request: NextRequest) {
  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Credentials fehlen in .env.local' }, { status: 500 })
  }

  let body: { sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sessionId } = body
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const auth = readAuth()
  if (!auth?.accessToken || !auth.channelId) {
    return NextResponse.json({ error: 'Nicht authentifiziert — /setup öffnen' }, { status: 401 })
  }

  let { accessToken, refreshToken, channelId } = auth

  // Try creating one subscription; if 401, refresh token first
  const probe = await createSubscription(
    clientId,
    accessToken,
    sessionId,
    SUBSCRIPTIONS[0].type,
    SUBSCRIPTIONS[0].version,
    channelId,
    SUBSCRIPTIONS[0].needsModerator ?? false
  )

  if (probe.status === 401 && refreshToken) {
    const refreshed = await doRefresh(clientId, clientSecret, refreshToken)
    if (!refreshed) {
      return NextResponse.json({ error: 'Token refresh fehlgeschlagen' }, { status: 401 })
    }
    accessToken = refreshed.access_token
    refreshToken = refreshed.refresh_token
    writeAuth({
      ...auth,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    })
  }

  // Create all subscriptions (first one may already be done or retried after refresh)
  const results = await Promise.all(
    SUBSCRIPTIONS.map(({ type, version, needsModerator }) =>
      createSubscription(
        clientId,
        accessToken,
        sessionId,
        type,
        version,
        channelId,
        needsModerator ?? false
      )
    )
  )

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    return NextResponse.json(
      { error: `${failed.length} subscriptions failed`, statuses: results.map((r) => r.status) },
      { status: 207 }
    )
  }

  return NextResponse.json({ ok: true, count: results.length })
}
