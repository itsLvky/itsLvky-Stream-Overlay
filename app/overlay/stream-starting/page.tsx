'use client'

import { useState, useEffect } from 'react'
import { StreamerbotProvider, useStreamerbot } from '@/app/components/overlay/StreamerbotContext'
import TopBar from '@/app/components/overlay/TopBar'
import ChatPanel from '@/app/components/overlay/ChatPanel'

const CHANNEL_NAME = process.env.NEXT_PUBLIC_CHANNEL_NAME ?? ''

const BOOT_LINES = [
  { color: '#28c840', label: '[ OK  ]', text: 'Loaded stream-overlay.target', delay: 0.4 },
  { color: '#28c840', label: '[ OK  ]', text: 'Reached target: Basic System', delay: 1.0 },
  {
    color: '#28c840',
    label: '[ OK  ]',
    text: 'Started twitch-auth.service — authenticated',
    delay: 1.6,
  },
  {
    color: '#28c840',
    label: '[ OK  ]',
    text: 'Started streamerbot-ws.service — connected',
    delay: 2.2,
  },
  { color: '#28c840', label: '[ OK  ]', text: 'Started chat-renderer.service — ready', delay: 2.8 },
  { color: '#ffbd2e', label: '[WAIT ]', text: 'Starting stream.service…', delay: 3.4 },
]

// ─────────────────────────────────────────────────────────────────────────────
function Content() {
  const { connected, broadcasterName, gameName } = useStreamerbot()
  const [progress, setProgress] = useState(0)

  // 0 → 85 % in 20 s, then 85 → 95 % over 60 s
  useEffect(() => {
    const t0 = Date.now()
    const id = setInterval(() => {
      const s = (Date.now() - t0) / 1000
      const p = s < 20 ? (s / 20) * 85 : 85 + Math.min(10, ((s - 20) / 60) * 10)
      setProgress(Math.min(95, p))
    }, 120)
    return () => clearInterval(id)
  }, [])

  const channel = broadcasterName ?? CHANNEL_NAME
  const category = gameName ?? 'Just Chatting'
  const pct = Math.round(progress)

  // Build ASCII box line: center /<channel> in 14-char inner width
  const chanSlug = `/${channel}`.slice(0, 12)
  const padTotal = Math.max(0, 14 - chanSlug.length)
  const padL = Math.floor(padTotal / 2)
  const padR = padTotal - padL
  const chanLine = ' '.repeat(padL) + chanSlug + ' '.repeat(padR)

  const asciiLogo = [
    '╔══════════════╗',
    '║              ║',
    '║    STREAM    ║',
    '║   STARTING   ║',
    '║              ║',
    '╠══════════════╣',
    '║  twitch.tv   ║',
    `║${chanLine}║`,
    '╚══════════════╝',
  ].join('\n')

  const sysinfo: [string, string][] = [
    ['OS', 'Twitch Linux x86_64'],
    ['Host', channel],
    ['Shell', 'bash 5.2.21'],
    ['Terminal', 'stream-overlay'],
    ['WM', 'OBS Studio'],
    ['Resolution', '1920 × 1080'],
    ['Category', category],
    ['Status', connected ? 'StreamerBot  connected' : 'StreamerBot  offline'],
  ]

  return (
    <div className="screen-dotgrid fixed inset-0 flex flex-col" style={{ background: '#060608' }}>
      <TopBar />

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
              root@stream-overlay:~ — bash
            </span>
            <span
              className="ml-auto font-mono text-sm font-bold tracking-widest"
              style={{ color: '#bf7fff' }}
            >
              [ STARTING ]
            </span>
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col justify-center gap-6 overflow-hidden px-8 py-6 font-mono">
            {/* ── Neofetch row ── */}
            <div className="flex gap-10">
              {/* ASCII logo */}
              <pre
                className="shrink-0 text-sm leading-relaxed select-none"
                style={{ color: '#9146FF', lineHeight: '1.6' }}
              >
                {asciiLogo}
              </pre>

              {/* Sysinfo */}
              <div className="flex flex-col justify-center gap-1.5" style={{ fontSize: '1rem' }}>
                <div className="mb-1 flex items-center gap-1" style={{ fontSize: '1.125rem' }}>
                  <span style={{ color: '#bf7fff', fontWeight: 700 }}>{channel}</span>
                  <span style={{ color: '#444' }}>@</span>
                  <span style={{ color: '#bf7fff', fontWeight: 700 }}>twitch</span>
                </div>
                <div style={{ color: '#252535', marginBottom: 4 }}>{'─'.repeat(34)}</div>
                {sysinfo.map(([key, val]) => (
                  <div key={key} className="flex gap-1">
                    <span style={{ color: '#bf7fff', minWidth: 96 }}>{key}</span>
                    <span style={{ color: '#444' }}>:</span>
                    <span style={{ color: '#cccccc' }}> {val}</span>
                  </div>
                ))}
                {/* Colour palette */}
                <div className="mt-3 flex gap-1.5">
                  {[
                    '#16041f',
                    '#2d1b69',
                    '#4c1d95',
                    '#6B21A8',
                    '#9146FF',
                    '#bf7fff',
                    '#d4a3ff',
                    '#ffffff',
                  ].map((c) => (
                    <span
                      key={c}
                      style={{
                        background: c,
                        width: 24,
                        height: 16,
                        display: 'inline-block',
                        borderRadius: 3,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(145,70,255,0.18)' }} />

            {/* ── Boot log ── */}
            <div className="flex flex-col gap-1" style={{ fontSize: '1rem' }}>
              {BOOT_LINES.map((line, i) => (
                <div
                  key={i}
                  className="screen-boot-line flex items-center gap-3"
                  style={{ animationDelay: `${line.delay}s` }}
                >
                  <span style={{ color: line.color, fontWeight: 700, minWidth: 64 }}>
                    {line.label}
                  </span>
                  <span style={{ color: '#666' }}>{line.text}</span>
                </div>
              ))}
            </div>

            {/* Shell prompt */}
            <div className="flex flex-wrap items-center gap-1" style={{ fontSize: '1.125rem' }}>
              <span style={{ color: '#9146FF' }}>root</span>
              <span style={{ color: '#444' }}>@</span>
              <span style={{ color: '#bf7fff' }}>stream</span>
              <span style={{ color: '#cccccc' }}>:~#</span>
              <span style={{ color: '#888' }}> sudo systemctl start </span>
              <span style={{ color: '#ffffff' }}>{channel}.stream</span>
              <span className="screen-cursor" style={{ color: '#bf7fff' }}>
                █
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div
                className="mb-2 h-2.5 overflow-hidden rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #4c1d95, #9146FF, #bf7fff)',
                    transition: 'width 0.15s linear',
                  }}
                />
              </div>
              <div className="flex justify-between" style={{ fontSize: '1rem', color: '#444' }}>
                <span>Initializing stream environment…</span>
                <span style={{ color: '#bf7fff' }}>{pct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: chat ── */}
        <ChatPanel />
      </div>
    </div>
  )
}

export default function StreamStartingOverlay() {
  return (
    <StreamerbotProvider>
      <Content />
    </StreamerbotProvider>
  )
}
