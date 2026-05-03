'use client'

import { useState, useEffect } from 'react'
import { StreamerbotProvider, useStreamerbot } from '@/app/components/overlay/StreamerbotContext'
import TopBar from '@/app/components/overlay/TopBar'
import EventBar from '@/app/components/overlay/EventBar'
import ChatPanel from '@/app/components/overlay/ChatPanel'

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

// ─────────────────────────────────────────────────────────────────────────────
function Content() {
  const { broadcasterName } = useStreamerbot()
  const now = useClock()

  const channel = broadcasterName ?? CHANNEL_NAME
  const timeStr = now
    ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    : '--:--:--'
  const dateStr = now
    ? `${WEEKDAYS[now.getDay()]} ${now.getDate()}. ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
    : ''

  return (
    <div className="screen-dotgrid fixed inset-0 flex flex-col" style={{ background: '#060608' }}>
      <TopBar />
      <EventBar />

      {/* ── Two-column layout ── */}
      <div className="flex flex-1 gap-5 overflow-hidden p-5">
        {/* ── Left: main terminal ── */}
        <div
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl"
          style={{
            border: '1px solid rgba(145,70,255,0.40)',
            background: 'rgba(5,5,12,0.97)',
            boxShadow: '0 0 100px rgba(145,70,255,0.10)',
          }}
        >
          {/* Title bar */}
          <div
            className="flex h-11 shrink-0 items-center gap-2 px-5"
            style={{
              background: 'rgba(145,70,255,0.08)',
              borderBottom: '1px solid rgba(145,70,255,0.25)',
            }}
          >
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: '#ff5f57' }} />
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: '#ffbd2e' }} />
            <span className="h-3.5 w-3.5 rounded-full" style={{ background: '#28c840' }} />
            <span className="ml-4 font-mono text-base" style={{ color: '#555' }}>
              {channel}@twitch:~ — session suspended
            </span>
            <span
              className="ml-auto font-mono text-sm font-bold tracking-widest"
              style={{ color: '#ffbd2e' }}
            >
              [ SUSPENDED ]
            </span>
          </div>

          {/* Body — centred vertically */}
          <div className="flex flex-1 flex-col items-center justify-center gap-7 px-12 py-8 font-mono">
            {/* Lock hint (subtle) */}
            <pre
              className="text-sm leading-relaxed select-none"
              style={{ color: 'rgba(145,70,255,0.35)' }}
            >{`╔════════════════════════════════════════╗
║   SESSION SUSPENDED  —  swaylock       ║
╚════════════════════════════════════════╝`}</pre>

            {/* ── FOCAL TEXT ── */}
            <div className="flex flex-col items-center gap-3 text-center">
              {/* Shell output prompt — dim */}
              <div className="text-lg" style={{ color: '#444' }}>
                <span style={{ color: '#9146FF' }}>{channel}</span>
                <span style={{ color: '#333' }}>@</span>
                <span style={{ color: '#bf7fff' }}>twitch</span>
                <span style={{ color: '#555' }}>:~$ </span>
                <span style={{ color: '#444' }}>cat message.txt</span>
              </div>

              {/* THE message */}
              <div
                className="screen-glow-text font-bold tracking-wide"
                style={{
                  fontSize: '4.5rem',
                  lineHeight: '1.1',
                  color: '#ffffff',
                  letterSpacing: '0.02em',
                }}
              >
                Gleich geht es weiter.
              </div>
            </div>

            {/* Divider */}
            <div className="w-full" style={{ borderTop: '1px solid rgba(145,70,255,0.15)' }} />

            {/* Clock — secondary */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="font-bold tabular-nums"
                style={{
                  fontSize: '3.75rem',
                  color: '#dddddd',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.08em',
                }}
              >
                {timeStr}
              </div>
              <div style={{ fontSize: '1.25rem', color: '#555' }}>{dateStr}</div>
            </div>

            {/* Divider */}
            <div className="w-full" style={{ borderTop: '1px solid rgba(145,70,255,0.15)' }} />

            {/* Shell lines */}
            <div className="flex w-full flex-col gap-2.5" style={{ fontSize: '1.125rem' }}>
              <div className="flex flex-wrap items-center gap-1">
                <span style={{ color: '#9146FF' }}>{channel}</span>
                <span style={{ color: '#444' }}>@</span>
                <span style={{ color: '#bf7fff' }}>twitch</span>
                <span style={{ color: '#cccccc' }}>:~$</span>
                <span style={{ color: '#888' }}> afk --message=</span>
                <span style={{ color: '#28c840' }}>&quot;brb in a bit&quot;</span>
                <span style={{ color: '#555' }}> --notify-chat</span>
              </div>
              <div className="flex items-center gap-3" style={{ color: '#444' }}>
                <span>[1]+</span>
                <span style={{ color: '#ffbd2e' }}>Suspended</span>
                <span>{channel}.stream</span>
              </div>
              <div className="flex items-center gap-1">
                <span style={{ color: '#9146FF' }}>{channel}</span>
                <span style={{ color: '#444' }}>@</span>
                <span style={{ color: '#bf7fff' }}>twitch</span>
                <span style={{ color: '#cccccc' }}>:~$</span>
                <span className="screen-cursor" style={{ color: '#bf7fff' }}>
                  {' '}
                  █
                </span>
              </div>
            </div>

            {/* Resume hint */}
            <div style={{ fontSize: '1rem', color: '#252535' }}>
              Press any key to resume session…
            </div>
          </div>
        </div>

        {/* ── Right: chat ── */}
        <ChatPanel />
      </div>
    </div>
  )
}

export default function AfkOverlay() {
  return (
    <StreamerbotProvider>
      <Content />
    </StreamerbotProvider>
  )
}
