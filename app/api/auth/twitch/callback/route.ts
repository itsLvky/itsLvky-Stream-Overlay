import { NextRequest, NextResponse } from 'next/server'
import { writeAuth } from '@/lib/server-state'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/auth/twitch/callback`

function redirectSetup(params: Record<string, string>) {
  return NextResponse.redirect(`${APP_URL}/setup?${new URLSearchParams(params)}`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) return redirectSetup({ error })
  if (!code) return redirectSetup({ error: 'no_code' })

  const clientId = process.env.TWITCH_CLIENT_ID
  const clientSecret = process.env.TWITCH_CLIENT_SECRET
  if (!clientId || !clientSecret) return redirectSetup({ error: 'missing_credentials' })

  const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!tokenRes.ok) {
    console.error('[Twitch OAuth] token exchange failed:', await tokenRes.text())
    return redirectSetup({ error: 'token_exchange_failed' })
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json()

  const userRes = await fetch('https://api.twitch.tv/helix/users', {
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${access_token}` },
  })
  const login: string = userRes.ok ? ((await userRes.json()).data?.[0]?.login ?? '') : ''

  // Persist tokens to disk — survives server restarts, works from any browser
  writeAuth({
    accessToken: access_token,
    refreshToken: refresh_token ?? '',
    channelLogin: process.env.TWITCH_CHANNEL_LOGIN ?? login,
    expiresAt: Date.now() + (expires_in ?? 14400) * 1000,
  })

  return redirectSetup({ success: '1', login })
}
