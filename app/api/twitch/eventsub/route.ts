import { NextResponse } from 'next/server'
import { ensureEventSub, eventSubStatus } from '@/lib/twitch-eventsub'
import { streamStateListenerCount } from '@/lib/event-bus'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Diagnose: zeigt, ob die EventSub-Verbindung des Servers steht und welche
// Subscriptions Twitch akzeptiert hat. Früher legte diese Route Subscriptions
// für den aufrufenden Browser an — das macht jetzt lib/twitch-eventsub.ts
// einmalig serverseitig.
export function GET() {
  ensureEventSub()
  return NextResponse.json({
    ...eventSubStatus(),
    connectedOverlays: streamStateListenerCount(),
  })
}
