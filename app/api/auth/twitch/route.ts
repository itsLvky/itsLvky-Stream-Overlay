import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL}/api/auth/twitch/callback`

export async function GET() {
  const clientId = process.env.TWITCH_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'TWITCH_CLIENT_ID fehlt in .env.local' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: '',
  })

  return NextResponse.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`)
}
