'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { StreamerbotClient } from '@streamerbot/client'

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
}

const StreamerbotContext = createContext<StreamerbotState>({
  connected: false,
  messages: [],
  broadcasterName: null,
  viewerCount: null,
  streamStartedAt: null,
  gameName: null,
})

export function useStreamerbot() {
  return useContext(StreamerbotContext)
}

const WS_HOST = process.env.NEXT_PUBLIC_STREAMERBOT_HOST ?? '127.0.0.1'
const WS_PORT = Number(process.env.NEXT_PUBLIC_STREAMERBOT_PORT ?? 8080)
const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME ?? ''

const MAX_MESSAGES = 80

// StreamerBot role IDs
const ROLE_VIP = 2
const ROLE_MODERATOR = 3
const ROLE_BROADCASTER = 4

export function StreamerbotProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [broadcasterName, setBroadcasterName] = useState<string | null>(null)
  const [viewerCount, setViewerCount] = useState<number | null>(null)
  const [streamStartedAt, setStreamStartedAt] = useState<string | null>(null)
  const [gameName, setGameName] = useState<string | null>(null)

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

          // Restore persisted state immediately (survives scene reloads)
          try {
            const res = await fetch('/api/stream-state')
            if (res.ok) {
              const state = await res.json()
              if (!destroyed && state.streamStartedAt) setStreamStartedAt(state.streamStartedAt)
              if (!destroyed && state.viewerCount != null) setViewerCount(state.viewerCount)
              if (!destroyed && state.gameName) setGameName(state.gameName)
            }
          } catch {
            /* no persisted state — fine */
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
          fetch('/api/stream-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ viewerCount: v }),
          }).catch(() => {})
        }
      })

      // ── Category changes ─────────────────────────────────────────────────
      await client.on('Twitch.StreamUpdate', (data) => {
        if (destroyed) return
        const name = data.data?.game?.name
        if (name) {
          setGameName(name)
          fetch('/api/stream-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameName: name }),
          }).catch(() => {})
        }
      })

      await client.on('Twitch.StreamOnline', (data: any) => {
        if (destroyed) return
        const d = data?.data
        const startedAt = d?.startedAt ?? d?.started_at ?? d?.createdAt ?? null
        if (startedAt) {
          const s = String(startedAt)
          setStreamStartedAt(s)
          fetch('/api/stream-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ streamStartedAt: s }),
          }).catch(() => {})
        }
      })

      await client.on('Twitch.StreamOffline', () => {
        if (destroyed) return
        setStreamStartedAt(null)
        setViewerCount(null)
        fetch('/api/stream-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamStartedAt: null, viewerCount: null }),
        }).catch(() => {})
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
      value={{ connected, messages, broadcasterName, viewerCount, streamStartedAt, gameName }}
    >
      {children}
    </StreamerbotContext.Provider>
  )
}
