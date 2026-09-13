'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { StreamerbotClient } from '@streamerbot/client'
import type {
  LastBitsEvent,
  LastDonationEvent,
  LastRedemptionEvent,
  StreamState,
} from '@/lib/server-state'

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

// ── Twitch.ChatMessage payload (EventSub-based, Streamer.bot 1.0.5+) ─────────
// @streamerbot/client's bundled types still reflect the old IRC-based shape,
// so we define the real runtime shape here and cast to it.
interface EventSubChatMessage {
  messageId: string
  text: string
  user: {
    id: string
    login: string
    name: string
    color: string
    role: number
    subscribed: boolean
    badges: ChatBadge[]
  } | null
  emotes: ChatEmote[] | null
}

interface EventSubChatMessageDeleted {
  messageId: string | null
}

interface EventSubUserModerationAction {
  targetUser: { id: string } | null
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

  // ── Server-State via SSE ────────────────────────────────────────
  // Follower, Subs, Bits und Rewards kommen vom Server: der hält eine einzige
  // Twitch-EventSub-Verbindung und pusht jede Änderung an alle Browser-Sources.
  // Vorher öffnete jede Source ihre eigene EventSub-Verbindung — Twitch erlaubt
  // aber nur 3 pro Client-ID, und jede Source sah nur ihre eigenen Events.
  useEffect(() => {
    const source = new EventSource('/api/stream-state/stream')

    source.addEventListener('state', (event) => {
      let state: StreamState
      try {
        state = JSON.parse((event as MessageEvent).data)
      } catch {
        return
      }
      setViewerCount(state.viewerCount)
      setStreamStartedAt(state.streamStartedAt)
      setGameName(state.gameName)
      setLastFollower(state.lastFollower)
      setLastSubscriber(state.lastSubscriber)
      setLastBits(state.lastBits)
      setLastDonation(state.lastDonation)
      setLastRedemption(state.lastRedemption)
    })

    // EventSource verbindet bei Fehlern selbständig neu — wichtig für OBS,
    // wenn der Dev-Server zwischendurch neu startet.
    return () => source.close()
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
      // Streamer.bot 1.0.5+ moved Twitch chat from IRC to EventSub, which replaced
      // the old `data.data.message` shape with a flat payload + nested `user` object.
      await client.on('Twitch.ChatMessage', (data) => {
        if (destroyed) return
        const msg = data.data as unknown as EventSubChatMessage
        const user = msg.user
        if (!user) return
        setMessages((prev) => [
          ...prev.slice(-(MAX_MESSAGES - 1)),
          {
            id: msg.messageId || crypto.randomUUID(),
            userId: user.id,
            username: user.login,
            displayName: user.name || user.login,
            color: user.color || '#9146FF',
            message: msg.text,
            isSub: !!user.subscribed,
            isMod: user.role === ROLE_MODERATOR,
            isVip: user.role === ROLE_VIP,
            isBroadcaster: user.role === ROLE_BROADCASTER,
            emotes: (msg.emotes ?? []).map((e) => ({
              name: e.name,
              startIndex: e.startIndex,
              endIndex: e.endIndex,
              imageUrl: e.imageUrl,
            })),
            badges: (user.badges ?? []).map((b) => ({
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
        const { messageId } = data.data as unknown as EventSubChatMessageDeleted
        setMessages((prev) => prev.filter((m) => m.id !== messageId))
      })

      await client.on('Twitch.UserTimedOut', (data) => {
        if (destroyed) return
        const { targetUser } = data.data as unknown as EventSubUserModerationAction
        setMessages((prev) => prev.filter((m) => m.userId !== targetUser?.id))
      })

      await client.on('Twitch.UserBanned', (data) => {
        if (destroyed) return
        const { targetUser } = data.data as unknown as EventSubUserModerationAction
        setMessages((prev) => prev.filter((m) => m.userId !== targetUser?.id))
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
