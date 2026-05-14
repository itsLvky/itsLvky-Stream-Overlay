'use client'

import { useState, useEffect } from 'react'
import { useStreamerbot } from './StreamerbotContext'

// Set NEXT_PUBLIC_CHANNEL_NAME in .env.local → displayed as "twitch.tv/<name>"
const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME ?? ''

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

function useClock() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

// Counts up every second from an ISO start timestamp
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

function Module({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-9 items-center gap-2 rounded-full px-4 font-medium ${className}`}
      style={{
        background: 'rgba(255,255,255,0.10)',
        border: '1px solid rgba(255,255,255,0.18)',
      }}
    >
      {children}
    </div>
  )
}

function LiveDot({ on }: { on: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {on && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ background: '#bf7fff' }}
        />
      )}
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ background: on ? '#bf7fff' : '#555' }}
      />
    </span>
  )
}

function useShowDauerwerbesendung(): boolean {
  const [show, setShow] = useState(false)
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => setShow(Boolean(d.showDauerwerbesendung)))
      .catch(() => {})
  }, [])
  return show
}

export default function TopBar() {
  const { connected, broadcasterName, viewerCount, streamStartedAt, gameName } = useStreamerbot()
  const now = useClock()
  const uptime = useUptime(streamStartedAt)
  const showDauerwerbesendung = useShowDauerwerbesendung()

  const timeStr = now
    ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    : '--:--:--'
  const dateStr = now
    ? `${WEEKDAYS[now.getDay()]} ${now.getDate()}. ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
    : ''

  return (
    <div
      className="flex shrink-0 items-center justify-between px-4"
      style={{
        height: '52px',
        background: 'rgba(6, 6, 12, 0.95)',
        borderBottom: '2px solid rgba(145, 70, 255, 0.55)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-2.5">
        <Module>
          <LiveDot on={connected} />
          <span
            className="font-mono text-sm font-bold"
            style={{ color: connected ? '#ffffff' : '#888' }}
          >
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </Module>

        {showDauerwerbesendung && (
          <Module>
            <span className="text-sm font-bold tracking-wide" style={{ color: '#bf7fff' }}>
              Dauerwerbesendung
            </span>
          </Module>
        )}

        <Module>
          <span className="text-sm" style={{ color: '#cccccc' }}>
            {gameName ?? 'Just Chatting'}
          </span>
        </Module>
      </div>

      {/* ── Center ── */}
      <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2.5">
        <Module className="gap-2.5">
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
          <span
            className="font-mono text-base font-bold tracking-wider"
            style={{ color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}
          >
            {timeStr}
          </span>
        </Module>
        <Module>
          <span className="text-sm" style={{ color: '#cccccc' }}>
            {dateStr}
          </span>
        </Module>
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-2.5">
        {/* Viewer count — shown when not null/undefined */}
        {viewerCount != null && (
          <Module>
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
          </Module>
        )}

        {/* Uptime — shown when we have a stream start timestamp */}
        {uptime !== null && (
          <Module>
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
            <span className="font-mono text-sm" style={{ color: '#aaaaaa' }}>
              uptime
            </span>
            <span
              className="font-mono text-sm font-bold"
              style={{ color: '#ffffff', fontVariantNumeric: 'tabular-nums' }}
            >
              {uptime}
            </span>
          </Module>
        )}

        <Module>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: '#bf7fff', flexShrink: 0 }}
          >
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
          </svg>
          <span className="text-sm font-semibold" style={{ color: '#ffffff' }}>
            twitch.tv/{CHANNEL_NAME}
          </span>
        </Module>
      </div>
    </div>
  )
}
