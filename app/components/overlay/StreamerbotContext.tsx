'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { StreamerbotClient } from '@streamerbot/client'
import type { LastBitsEvent, LastDonationEvent, LastRedemptionEvent } from '@/lib/server-state'

// ── Shapes matching @streamerbot/client TwitchEmote / TwitchBadge ────────────
export interface ChatEmote {
  name: string
  startIndex: number
  endIndex: number
  imageUrl: string
}

export interface ChatBadge {
  name: string // TwitchBadge uses .name, not .type
  version: string
  imageUrl: string
}

export interface ChatMessage {
  id: string
  userId: string
  username: string
  displayName: string
  color: string
  message: string
  isSub: boolean
  isMod: boolean
  isVip: boolean
  isBroadcaster: boolean
  emotes: ChatEmote[]
  badges: ChatBadge[]
  timestamp: Date
}

interface StreamerbotState {
  connected: boolean
  messages: ChatMessage[]
  broadcasterName: string | null
  viewerCount: number | null
  streamStartedAt: string | null
  gameName: string | null
  lastFollower: string | null
  lastSubscriber: string | null
  lastBits: LastBitsEvent | null
  lastDonation: LastDonationEvent | null
  lastRedemption: LastRedemptionEvent | null
}

export type StreamerbotInitialState = Partial<
  Pick<
    StreamerbotState,
    | 'viewerCount'
    | 'streamStartedAt'
    | 'gameName'
    | 'lastFollower'
    | 'lastSubscriber'
    | 'lastBits'
    | 'lastDonation'
    | 'lastRedemption'
  >
>

const StreamerbotContext = createContext<StreamerbotState>({
  connected: false,
  messages: [],
  broadcasterName: null,
  viewerCount: null,
  streamStartedAt: null,
  gameName: null,
  lastFollower: null,
  lastSubscriber: null,
  lastBits: null,
  lastDonation: null,
  lastRedemption: null,
})

export function useStreamerbot() {
  return useContext(StreamerbotContext)
}

// keepalive: true ensures the request is not cancelled when the page unloads (OBS scene switch)
function persistState(patch: Record<string, unknown>) {
  fetch('/api/stream-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify(patch),
  }).catch(() => {})
}

const WS_HOST = process.env.NEXT_PUBLIC_STREAMERBOT_HOST ?? '127.0.0.1'
const WS_PORT = Number(process.env.NEXT_PUBLIC_STREAMERBOT_PORT ?? 8080)
const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME ?? ''

const MAX_MESSAGES = 80

// StreamerBot role IDs
const ROLE_VIP = 2
const ROLE_MODERATOR = 3
const ROLE_BROADCASTER = 4

export function StreamerbotProvider({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: StreamerbotInitialState
}) {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [broadcasterName, setBroadcasterName] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState<number | null>(initialState?.viewerCount ?? null)
  const [streamStartedAt, setStreamStartedAt] = useState<string | null>(
    initialState?.streamStartedAt ?? null
  )
  const [gameName, setGameName] = useState<string | null>(initialState?.gameName ?? null)
  const [lastFollower, setLastFollower] = useState<string | null>(
    initialState?.lastFollower ?? null
  )
  const [lastSubscriber, setLastSubscriber] = useState<string | null>(
    initialState?.lastSubscriber ?? null
  )
  const [lastBits, setLastBits] = useState<LastBitsEvent | null>(initialState?.lastBits ?? null)
  const [lastDonation, setLastDonation] = useState<LastDonationEvent | null>(
    initialState?.lastDonation ?? null
  )
  const [lastRedemption, setLastRedemption] = useState<LastRedemptionEvent | null>(
    initialState?.lastRedemption ?? null
  )

  // ── Twitch EventSub WebSocket ──────────────────────────────────────────────
  useEffect(() => {
    let destroyed = false
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let keepaliveTimer: ReturnType<typeof setTimeout> | null = null
    const KEEPALIVE_TIMEOUT_MS = 15_000 // Twitch sends keepalive every ~10s, 15s is safe

    function clearKeepalive() {
      if (keepaliveTimer) {
        clearTimeout(keepaliveTimer)
        keepaliveTimer = null
      }
    }

    function resetKeepalive(reconnect: () => void) {
      clearKeepalive()
      keepaliveTimer = setTimeout(() => {
        if (!destroyed) reconnect()
      }, KEEPALIVE_TIMEOUT_MS)
    }

    function connect(url = 'wss://eventsub.wss.twitch.tv/ws') {
      if (destroyed) return
      ws = new WebSocket(url)

      ws.onmessage = async (evt) => {
        if (destroyed) return
        let msg: any
        try {
          msg = JSON.parse(evt.data as string)
        } catch {
          return
        }
        const type: string = msg?.metadata?.message_type ?? ''

        // Reset keepalive on any message
        resetKeepalive(() => {
          ws?.close()
          connect()
        })

        if (type === 'session_welcome') {
          const sessionId: string = msg.payload?.session?.id ?? ''
          if (!sessionId) return
          // Register all EventSub subscriptions server-side
          await fetch('/api/twitch/eventsub', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          }).catch(() => {})
        } else if (type === 'session_reconnect') {
          const newUrl: string = msg.payload?.session?.reconnect_url ?? ''
          ws?.close()
          if (newUrl) connect(newUrl)
        } else if (type === 'notification') {
          const subType: string = msg.metadata?.subscription_type ?? ''
          const event = msg.payload?.event ?? {}

          if (subType === 'channel.follow') {
            const username: string = event.user_name || event.user_login || ''
            if (!username) return
            setLastFollower(username)
            persistState({ lastFollower: username })
          } else if (subType === 'channel.cheer') {
            const username: string = event.is_anonymous
              ? 'anonymous'
              : event.user_name || event.user_login || ''
            const amount: number = event.bits ?? 0
            if (!username || !amount) return
            const bitsEvent: LastBitsEvent = { username, amount }
            setLastBits(bitsEvent)
            persistState({ lastBits: bitsEvent })
          } else if (
            subType === 'channel.subscribe' ||
            subType === 'channel.subscription.message'
          ) {
            const username: string = event.user_name || event.user_login || ''
            if (!username) return
            setLastSubscriber(username)
            persistState({ lastSubscriber: username })
          } else if (subType === 'channel.subscription.gift') {
            // Gift sub: show the gifter (no individual recipient in this event)
            const username: string = event.is_anonymous
              ? 'anonymous'
              : event.user_name || event.user_login || ''
            if (!username) return
            setLastSubscriber(username)
            persistState({ lastSubscriber: username })
          } else if (subType === 'channel.channel_points_custom_reward_redemption.add') {
            const username: string = event.user_name || event.user_login || ''
            const title: string = event.reward?.title ?? ''
            if (!username || !title) return
            const redemptionEvent: LastRedemptionEvent = { username, title }
            setLastRedemption(redemptionEvent)
            persistState({ lastRedemption: redemptionEvent })
          }
        }
      }

      ws.onclose = () => {
        clearKeepalive()
        if (!destroyed) {
          reconnectTimer = setTimeout(() => connect(), 5_000)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      destroyed = true
      clearKeepalive()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [])

  // ── StreamerBot WebSocket (chat messages + stream metadata) ───────────────
  useEffect(() => {
    let destroyed = false
    const holder: { client: StreamerbotClient | null } = { client: null }

    async function setup() {
      const client = new StreamerbotClient({
        host: WS_HOST,
        port: WS_PORT,
        autoReconnect: true,
        immediate: false,
        onConnect: async () => {
          if (destroyed) return
          setConnected(true)
          try {
            const res = await client.getBroadcaster()
            if (!destroyed) {
              setBroadcasterName(res.platforms.twitch?.broadcastUserName ?? (CHANNEL_NAME || null))
            }
          } catch {
            /* StreamerBot not configured for Twitch — ignore */
          }

          // Refresh from live Twitch API (overwrites persisted state with current values)
          try {
            const res = await fetch('/api/stream-info')
            if (res.ok) {
              const info = await res.json()
              if (!destroyed && info.startedAt) setStreamStartedAt(info.startedAt)
              if (!destroyed && typeof info.viewerCount === 'number')
                setViewerCount(info.viewerCount)
              if (!destroyed && info.gameName) setGameName(info.gameName)
            }
          } catch {
            /* Twitch API not configured — fine */
          }
        },
        onDisconnect: () => {
          if (destroyed) return
          setConnected(false)
        },
      })

      holder.client = client
      if (destroyed) return

      // ── Chat messages ────────────────────────────────────────────────────
      await client.on('Twitch.ChatMessage', (data) => {
        if (destroyed) return
        const msg = data.data.message
        setMessages((prev) => [
          ...prev.slice(-(MAX_MESSAGES - 1)),
          {
            id: msg.msgId || crypto.randomUUID(),
            userId: msg.userId,
            username: msg.username,
            displayName: msg.displayName || msg.username,
            color: msg.color || '#9146FF',
            message: msg.message,
            isSub: msg.subscriber,
            isMod: msg.role === ROLE_MODERATOR,
            isVip: msg.role === ROLE_VIP,
            isBroadcaster: msg.role === ROLE_BROADCASTER,
            emotes: msg.emotes.map((e) => ({
              name: e.name,
              startIndex: e.startIndex,
              endIndex: e.endIndex,
              imageUrl: e.imageUrl,
            })),
            badges: msg.badges.map((b) => ({
              name: b.name,
              version: b.version,
              imageUrl: b.imageUrl,
            })),
            timestamp: new Date(),
          },
        ])
      })

      // ── Moderation ───────────────────────────────────────────────────────
      await client.on('Twitch.ChatMessageDeleted', (data) => {
        if (destroyed) return
        setMessages((prev) => prev.filter((m) => m.id !== data.data.targetMessageId))
      })

      await client.on('Twitch.UserTimedOut', (data) => {
        if (destroyed) return
        setMessages((prev) => prev.filter((m) => m.userId !== data.data.target_user_id))
      })

      await client.on('Twitch.UserBanned', (data) => {
        if (destroyed) return
        setMessages((prev) => prev.filter((m) => m.userId !== data.data.target_user_id))
      })

      // ── Live viewer count ────────────────────────────────────────────────
      await client.on('Twitch.ViewerCountUpdate', (data) => {
        if (destroyed) return
        const v = data.data?.viewers
        if (typeof v === 'number') {
          setViewerCount(v)
          persistState({ viewerCount: v })
        }
      })

      // ── Category changes ─────────────────────────────────────────────────
      await client.on('Twitch.StreamUpdate', (data) => {
        if (destroyed) return
        const name = data.data?.game?.name
        if (name) {
          setGameName(name)
          persistState({ gameName: name })
        }
      })

      await client.on('Twitch.StreamOnline', (data: any) => {
        if (destroyed) return
        const d = data?.data
        const startedAt = d?.startedAt ?? d?.started_at ?? d?.createdAt ?? null
        if (startedAt) {
          const s = String(startedAt)
          setStreamStartedAt(s)
          persistState({ streamStartedAt: s })
        }
      })

      await client.on('Twitch.StreamOffline', () => {
        if (destroyed) return
        setStreamStartedAt(null)
        setViewerCount(null)
        persistState({ streamStartedAt: null, viewerCount: null })
      })

      // ── Optional: uptime override from a StreamerBot timer action ────────
      // Broadcast: {"type":"StreamInfo","startedAt":"<ISO>"}
      await client.on('General.Custom', (data: any) => {
        if (destroyed) return
        const payload = data?.data ?? data
        if (payload?.type === 'StreamInfo') {
          if (payload.startedAt) setStreamStartedAt(String(payload.startedAt))
        }
      })

      // ── Ko-fi donation (via StreamerBot Ko-fi integration) ───────────────
      await client.on('Kofi.Donation', (data: any) => {
        if (destroyed) return
        const d = data?.data ?? data
        const username = d?.from_name
        const amount = d?.amount
        const currency = d?.currency ?? 'EUR'
        if (!username || !amount) return
        const event: LastDonationEvent = { username, amount: String(amount), currency }
        setLastDonation(event)
        persistState({ lastDonation: event })
      })

      await client.connect()
    }

    setup().catch(() => {
      /* initial connection refused — autoReconnect will retry */
    })

    return () => {
      destroyed = true
      holder.client?.disconnect().catch(() => {})
    }
  }, [])

  return (
    <StreamerbotContext.Provider
      value={{
        connected,
        messages,
        broadcasterName,
        viewerCount,
        streamStartedAt,
        gameName,
        lastFollower,
        lastSubscriber,
        lastBits,
        lastDonation,
        lastRedemption,
      }}
    >
      {children}
    </StreamerbotContext.Provider>
  )
}
