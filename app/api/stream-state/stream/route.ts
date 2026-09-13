import { getStreamState } from '@/lib/server-state'
import { subscribeStreamState } from '@/lib/event-bus'
import { ensureEventSub } from '@/lib/twitch-eventsub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Proxies (und manche OBS-Setups) puffern sonst den Stream.
const HEARTBEAT_MS = 15_000

export function GET(request: Request) {
  // Erster Overlay-Aufruf startet die EventSub-Verbindung des Servers.
  ensureEventSub()

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let unsubscribe: (() => void) | null = null
      let heartbeat: ReturnType<typeof setInterval> | null = null

      function cleanup() {
        if (closed) return
        closed = true
        if (heartbeat) clearInterval(heartbeat)
        unsubscribe?.()
        try {
          controller.close()
        } catch {
          /* bereits geschlossen */
        }
      }

      const send = (payload: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(payload))
        } catch {
          cleanup()
        }
      }

      // Aktueller Stand sofort — das Overlay wartet nicht auf das nächste Event.
      send(`event: state\ndata: ${JSON.stringify(getStreamState())}\n\n`)

      unsubscribe = subscribeStreamState((state) => {
        send(`event: state\ndata: ${JSON.stringify(state)}\n\n`)
      })

      heartbeat = setInterval(() => send(': ping\n\n'), HEARTBEAT_MS)

      request.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
