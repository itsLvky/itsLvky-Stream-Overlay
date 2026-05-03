'use client'

import { useState, useEffect } from 'react'
import { StreamerbotProvider, useStreamerbot } from '@/app/components/overlay/StreamerbotContext'
import TopBar from '@/app/components/overlay/TopBar'
import EventBar from '@/app/components/overlay/EventBar'

const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME ?? ''

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function useUptime(startedAt: string | null): string | null {
  const [elapsed, setElapsed] = useState<number | null>(null)

  useEffect(() => {
    if (!startedAt) {
      setElapsed(null)
      return
    }
    const start = new Date(startedAt).getTime()
    if (isNaN(start)) {
      setElapsed(null)
      return
    }
    setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    const id = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000))),
      1000
    )
    return () => clearInterval(id)
  }, [startedAt])

  if (elapsed === null) return null
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

// ── Bottom bar ────────────────────────────────────────────────────────────────

function BottomBar() {
  const { broadcasterName, viewerCount, streamStartedAt, gameName, connected } = useStreamerbot()
  const uptime = useUptime(streamStartedAt)
  const channel = broadcasterName ?? CHANNEL_NAME

  return (
    <div
      className="flex shrink-0 items-center justify-between px-4"
      style={{
        height: '52px',
        background: 'rgba(6, 6, 12, 0.95)',
        borderTop: '2px solid rgba(145, 70, 255, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Left: terminal prompt ── */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 items-center gap-2 rounded-full px-4"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <span className="font-mono text-sm" style={{ color: '#9146FF' }}>
            {channel}
          </span>
          <span className="font-mono text-sm" style={{ color: '#444' }}>
            @
          </span>
          <span className="font-mono text-sm" style={{ color: '#bf7fff' }}>
            twitch
          </span>
          <span className="font-mono text-sm" style={{ color: '#555' }}>
            :~$
          </span>
          <span className="screen-cursor font-mono text-sm" style={{ color: '#bf7fff' }}>
            █
          </span>
        </div>
      </div>

      {/* ── Center: active category ── */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div
          className="flex h-9 items-center gap-2.5 rounded-full px-5"
          style={{
            background: 'rgba(145,70,255,0.12)',
            border: '1px solid rgba(145,70,255,0.35)',
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: '#bf7fff', flexShrink: 0 }}
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <span className="font-mono text-sm font-semibold" style={{ color: '#ffffff' }}>
            {gameName ?? 'Just Chatting'}
          </span>
        </div>
      </div>

      {/* ── Right: viewer count + uptime ── */}
      <div className="flex items-center gap-2.5">
        {viewerCount != null && (
          <div
            className="flex h-9 items-center gap-2 rounded-full px-4"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#bf7fff' }}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}
            >
              {viewerCount.toLocaleString('de-DE')}
            </span>
          </div>
        )}

        {uptime !== null && (
          <div
            className="flex h-9 items-center gap-2 rounded-full px-4"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#bf7fff' }}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-mono text-xs" style={{ color: '#aaaaaa' }}>
              uptime
            </span>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}
            >
              {uptime}
            </span>
          </div>
        )}

        {/* Connection status when offline */}
        {!connected && (
          <div
            className="flex h-9 items-center gap-2 rounded-full px-4"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.10)',
            }}
          >
            <span className="font-mono text-xs" style={{ color: '#555' }}>
              streamerbot offline
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Side rulers: mark the 21:9 boundary ──────────────────────────────────────

function BoundaryLine({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        [position]: 0,
        height: '1px',
        background:
          'linear-gradient(90deg, transparent 0%, rgba(145,70,255,0.5) 15%, rgba(145,70,255,0.5) 85%, transparent 100%)',
        pointerEvents: 'none',
      }}
    />
  )
}

// ── Main content ──────────────────────────────────────────────────────────────

function Content() {
  return (
    <div className="fixed inset-0 flex flex-col">
      {/* ── Top dark area: bar + spacer ── */}
      <div
        className="screen-dotgrid relative flex flex-1 flex-col"
        style={{ background: '#060608' }}
      >
        <TopBar />
        <EventBar />
        {/* Spacer fills remaining height — shows dot-grid desktop background */}
        <div className="flex-1" />
        <BoundaryLine position="bottom" />
      </div>

      {/* ── 21:9 transparent game area ── */}
      <div
        style={{
          aspectRatio: '21 / 9',
          width: '100%',
          flexShrink: 0,
          background: 'transparent',
        }}
      />

      {/* ── Bottom dark area: spacer + bar ── */}
      <div
        className="screen-dotgrid relative flex flex-1 flex-col"
        style={{ background: '#060608' }}
      >
        <BoundaryLine position="top" />
        {/* Spacer fills remaining height */}
        <div className="flex-1" />
        <BottomBar />
      </div>
    </div>
  )
}

export default function UltrawideOverlay() {
  return (
    <StreamerbotProvider>
      <Content />
    </StreamerbotProvider>
  )
}
