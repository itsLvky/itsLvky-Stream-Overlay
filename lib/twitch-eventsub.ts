import { updateStreamState, type LastBitsEvent, type LastRedemptionEvent } from './server-state'
import { getValidAuth, forceRefreshAuth, readCredentials } from './twitch-auth'

// ── Warum serverseitig? ──────────────────────────────────────────────────────
// Twitch erlaubt pro Client-ID + User nur 3 EventSub-WebSockets mit aktiven
// Subscriptions. Vorher öffnete jede OBS-Browser-Source ihre eigene — ab der
// vierten Source bekam eine Verbindung keine Subscriptions mehr und wurde nach
// 10s mit Code 4003 gekappt. Diese Source zeigte dann dauerhaft den Stand vom
// Seitenaufruf. Jetzt hält der Server genau eine Verbindung und verteilt die
// Events per SSE an alle Overlays.

const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws'

// Twitch sendet alle ~10s ein Keepalive. 20s Toleranz für langsame Netze.
const KEEPALIVE_TIMEOUT_MS = 20_000
const RECONNECT_MIN_MS = 1_000
const RECONNECT_MAX_MS = 30_000

const SUBSCRIPTIONS: Array<{ type: string; version: string; needsModerator?: boolean }> = [
  { type: 'channel.follow', version: '2', needsModerator: true },
  { type: 'channel.cheer', version: '1' },
  { type: 'channel.subscribe', version: '1' },
  { type: 'channel.subscription.message', version: '1' },
  { type: 'channel.subscription.gift', version: '1' },
  { type: 'channel.channel_points_custom_reward_redemption.add', version: '1' },
]

export interface EventSubStatus {
  running: boolean
  connected: boolean
  sessionId: string | null
  subscriptions: Array<{ type: string; ok: boolean; status: number; error?: string }>
  lastEventAt: string | null
  lastError: string | null
  reconnects: number
}

type CreateResult = { type: string; ok: boolean; status: number; error?: string }

class EventSubConnection {
  private socket: WebSocket | null = null
  private previousSocket: WebSocket | null = null
  /** Invalidiert die Handler abgelöster Sockets — verhindert Doppel-Reconnects. */
  private generation = 0
  private keepaliveTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private backoffMs = RECONNECT_MIN_MS

  private started = false
  private connected = false
  private sessionId: string | null = null
  private subscriptionResults: CreateResult[] = []
  private lastEventAt: Date | null = null
  private lastError: string | null = null
  private reconnects = 0

  start(): void {
    if (this.started) return
    this.started = true
    console.log('[eventsub] Starte Twitch EventSub-Verbindung')
    this.open(EVENTSUB_URL, { resubscribe: true, keepPrevious: false })
  }

  status(): EventSubStatus {
    return {
      running: this.started,
      connected: this.connected,
      sessionId: this.sessionId,
      subscriptions: this.subscriptionResults,
      lastEventAt: this.lastEventAt?.toISOString() ?? null,
      lastError: this.lastError,
      reconnects: this.reconnects,
    }
  }

  // ── Verbindung ────────────────────────────────────────────────────────────

  private open(url: string, opts: { resubscribe: boolean; keepPrevious: boolean }): void {
    const generation = ++this.generation

    if (opts.keepPrevious) {
      // Twitch verlangt bei session_reconnect, die alte Verbindung offen zu
      // halten, bis auf der neuen das Welcome ankommt.
      this.previousSocket = this.socket
    } else {
      this.detach(this.socket)
    }

    const socket = new WebSocket(url)
    this.socket = socket

    socket.onopen = () => {
      if (generation !== this.generation) return
      this.connected = true
    }

    socket.onmessage = (event) => {
      if (generation !== this.generation) return
      this.armKeepalive()
      this.handleMessage(event.data, opts.resubscribe)
    }

    socket.onclose = (event) => {
      if (generation !== this.generation) return
      this.connected = false
      this.lastError = `Verbindung geschlossen (Code ${event.code})`
      console.warn('[eventsub] Verbindung geschlossen, Code', event.code, event.reason)
      this.scheduleReconnect()
    }

    socket.onerror = () => {
      if (generation !== this.generation) return
      this.lastError = 'WebSocket-Fehler'
      // onclose folgt und übernimmt den Reconnect.
    }
  }

  /** Handler entfernen und schließen — der Socket kann danach nichts mehr auslösen. */
  private detach(socket: WebSocket | null): void {
    if (!socket) return
    socket.onopen = null
    socket.onmessage = null
    socket.onclose = null
    socket.onerror = null
    try {
      socket.close()
    } catch {
      /* bereits geschlossen */
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.clearKeepalive()

    const delay = this.backoffMs
    this.backoffMs = Math.min(this.backoffMs * 2, RECONNECT_MAX_MS)
    this.reconnects += 1

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.open(EVENTSUB_URL, { resubscribe: true, keepPrevious: false })
    }, delay)
  }

  private armKeepalive(): void {
    this.clearKeepalive()
    this.keepaliveTimer = setTimeout(() => {
      console.warn('[eventsub] Keepalive ausgeblieben — verbinde neu')
      this.lastError = 'Keepalive-Timeout'
      this.scheduleReconnect()
    }, KEEPALIVE_TIMEOUT_MS)
  }

  private clearKeepalive(): void {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer)
      this.keepaliveTimer = null
    }
  }

  // ── Nachrichten ───────────────────────────────────────────────────────────

  private handleMessage(raw: unknown, resubscribe: boolean): void {
    let msg: {
      metadata?: { message_type?: string; subscription_type?: string }
      payload?: {
        session?: { id?: string; reconnect_url?: string }
        event?: Record<string, unknown>
      }
    }
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }

    switch (msg.metadata?.message_type) {
      case 'session_welcome': {
        const sessionId = msg.payload?.session?.id
        if (!sessionId) return
        this.sessionId = sessionId
        this.backoffMs = RECONNECT_MIN_MS

        // Die alte Verbindung darf jetzt weg (session_reconnect-Fall).
        this.detach(this.previousSocket)
        this.previousSocket = null

        if (resubscribe) {
          void this.registerSubscriptions(sessionId)
        } else {
          // Beim Reconnect über die reconnect_url übernimmt Twitch die
          // bestehenden Subscriptions — kein erneutes Anlegen nötig.
          console.log('[eventsub] Reconnect abgeschlossen, Session', sessionId)
        }
        return
      }

      case 'session_reconnect': {
        const url = msg.payload?.session?.reconnect_url
        if (!url) return
        console.log('[eventsub] Twitch fordert Reconnect an')
        this.open(url, { resubscribe: false, keepPrevious: true })
        return
      }

      case 'notification': {
        this.lastEventAt = new Date()
        this.applyEvent(msg.metadata?.subscription_type ?? '', msg.payload?.event ?? {})
        return
      }

      case 'revocation': {
        this.lastError = `Subscription widerrufen: ${msg.metadata?.subscription_type}`
        console.error('[eventsub]', this.lastError)
        return
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyEvent(subType: string, event: Record<string, any>): void {
    switch (subType) {
      case 'channel.follow': {
        const username: string = event.user_name || event.user_login || ''
        if (!username) return
        console.log('[eventsub] Follow:', username)
        updateStreamState({ lastFollower: username })
        return
      }

      case 'channel.cheer': {
        const username: string = event.is_anonymous
          ? 'anonymous'
          : event.user_name || event.user_login || ''
        const amount: number = event.bits ?? 0
        if (!username || !amount) return
        const bits: LastBitsEvent = { username, amount }
        console.log('[eventsub] Cheer:', username, amount)
        updateStreamState({ lastBits: bits })
        return
      }

      case 'channel.subscribe':
      case 'channel.subscription.message': {
        const username: string = event.user_name || event.user_login || ''
        if (!username) return
        console.log('[eventsub] Sub:', username)
        updateStreamState({ lastSubscriber: username })
        return
      }

      case 'channel.subscription.gift': {
        // Gift-Sub: der Schenkende wird angezeigt, einzelne Empfänger liefert
        // dieses Event nicht.
        const username: string = event.is_anonymous
          ? 'anonymous'
          : event.user_name || event.user_login || ''
        if (!username) return
        console.log('[eventsub] Gift-Sub von:', username)
        updateStreamState({ lastSubscriber: username })
        return
      }

      case 'channel.channel_points_custom_reward_redemption.add': {
        const username: string = event.user_name || event.user_login || ''
        const title: string = event.reward?.title ?? ''
        if (!username || !title) return
        const redemption: LastRedemptionEvent = { username, title }
        console.log('[eventsub] Reward:', username, '→', title)
        updateStreamState({ lastRedemption: redemption })
        return
      }
    }
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  private async registerSubscriptions(sessionId: string): Promise<void> {
    const credentials = readCredentials()
    if (!credentials) {
      this.fail('TWITCH_CLIENT_ID/SECRET fehlen in .env.local')
      return
    }

    const auth = await getValidAuth()
    if (!auth?.accessToken || !auth.channelId) {
      this.fail('Nicht bei Twitch authentifiziert — /setup öffnen')
      return
    }

    let results = await this.createAll(
      credentials.clientId,
      auth.accessToken,
      auth.channelId,
      sessionId
    )

    if (results.some((r) => r.status === 401)) {
      const refreshed = await forceRefreshAuth()
      if (refreshed?.accessToken) {
        results = await this.createAll(
          credentials.clientId,
          refreshed.accessToken,
          refreshed.channelId,
          sessionId
        )
      }
    }

    this.subscriptionResults = results
    const failed = results.filter((r) => !r.ok)

    if (failed.length === 0) {
      this.lastError = null
      console.log(`[eventsub] ${results.length} Subscriptions aktiv (Session ${sessionId})`)
      return
    }

    for (const result of failed) {
      console.error(
        `[eventsub] Subscription "${result.type}" fehlgeschlagen:`,
        result.status,
        result.error
      )
    }
    this.lastError = `${failed.length}/${results.length} Subscriptions fehlgeschlagen — siehe Server-Log`
  }

  private async createAll(
    clientId: string,
    accessToken: string,
    broadcasterId: string,
    sessionId: string
  ): Promise<CreateResult[]> {
    return Promise.all(
      SUBSCRIPTIONS.map(({ type, version, needsModerator }) =>
        this.create(
          clientId,
          accessToken,
          broadcasterId,
          sessionId,
          type,
          version,
          !!needsModerator
        )
      )
    )
  }

  private async create(
    clientId: string,
    accessToken: string,
    broadcasterId: string,
    sessionId: string,
    type: string,
    version: string,
    needsModerator: boolean
  ): Promise<CreateResult> {
    const condition: Record<string, string> = { broadcaster_user_id: broadcasterId }
    // channel.follow v2 braucht eine moderator_user_id — der Broadcaster selbst.
    if (needsModerator) condition.moderator_user_id = broadcasterId

    try {
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
        cache: 'no-store',
      })

      // 409 = für diese Session bereits angelegt
      if (res.ok || res.status === 409) return { type, ok: true, status: res.status }
      return { type, ok: false, status: res.status, error: await res.text() }
    } catch (err) {
      return { type, ok: false, status: 0, error: String(err) }
    }
  }

  private fail(message: string): void {
    this.lastError = message
    this.subscriptionResults = []
    console.error('[eventsub]', message)
  }
}

declare global {
  var __overlayEventSub: EventSubConnection | undefined
}

function instance(): EventSubConnection {
  if (!global.__overlayEventSub) global.__overlayEventSub = new EventSubConnection()
  return global.__overlayEventSub
}

/** Idempotent — startet die EventSub-Verbindung beim ersten Aufruf. */
export function ensureEventSub(): void {
  instance().start()
}

export function eventSubStatus(): EventSubStatus {
  return instance().status()
}
