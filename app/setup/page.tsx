import type { ReactNode } from 'react'
import { readAuth, readSettings } from '@/lib/server-state'
import type { BannerConfig } from './banner-types'
import DauerwerbesendungToggle from './DauerwerbesendungToggle'
import BannerSettings from './BannerSettings'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const ERROR_MESSAGES: Record<string, string> = {
  no_code: 'Kein Code von Twitch erhalten.',
  session_expired: 'Session abgelaufen — bitte erneut verbinden.',
  token_exchange_failed: 'Token-Austausch fehlgeschlagen. Client ID prüfen.',
  access_denied: 'Zugriff verweigert.',
}

const OVERLAYS = [
  { href: '/overlay/just-chatting', label: 'Just Chatting', desc: 'Webcam + Chat + TopBar' },
  { href: '/overlay/topbar-only', label: 'TopBar Only', desc: 'Für Ingame / Desktop' },
  { href: '/overlay/ultrawide', label: 'Ultrawide (21:9)', desc: '21:9 Monitor auf 16:9 Leinwand' },
  {
    href: '/overlay/stream-starting',
    label: 'Stream Starting',
    desc: 'Boot-Screen vor dem Stream',
  },
  { href: '/overlay/afk', label: 'AFK', desc: 'Session-suspended Screen' },
]

// ── Atoms ─────────────────────────────────────────────────────────────────────

function TwitchLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: '#9146FF' }}
    >
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function InlineCode({ children }: { children: ReactNode }) {
  return (
    <code
      style={{
        background: 'rgba(255,255,255,0.06)',
        color: '#ccc',
        borderRadius: 4,
        padding: '2px 6px',
        fontSize: '0.75rem',
      }}
    >
      {children}
    </code>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p
        style={{
          margin: 0,
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#555',
        }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

const BADGE_STYLES = {
  success: {
    background: 'rgba(0,180,80,0.12)',
    border: '1px solid rgba(0,180,80,0.3)',
    color: '#4dff9e',
  },
  error: {
    background: 'rgba(255,60,60,0.12)',
    border: '1px solid rgba(255,60,60,0.3)',
    color: '#ff7070',
  },
  info: {
    background: 'rgba(145,70,255,0.12)',
    border: '1px solid rgba(145,70,255,0.3)',
    color: '#bf7fff',
  },
} as const

function StatusBadge({
  variant,
  children,
}: {
  variant: keyof typeof BADGE_STYLES
  children: ReactNode
}) {
  const Icon = variant === 'error' ? AlertIcon : CheckIcon
  return (
    <div
      style={{
        ...BADGE_STYLES[variant],
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: '0.875rem',
      }}
    >
      <Icon />
      {children}
    </div>
  )
}

// ── Setup steps ───────────────────────────────────────────────────────────────

function SetupSteps({ appUrl }: { appUrl: string }) {
  const steps = [
    <>
      Twitch App anlegen:{' '}
      <a
        href="https://dev.twitch.tv/console/apps"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#9146FF' }}
      >
        dev.twitch.tv/console/apps
      </a>{' '}
      → OAuth Redirect URL: <InlineCode>{appUrl}/api/auth/twitch/callback</InlineCode>
    </>,
    <>
      Client ID in <InlineCode>.env.local</InlineCode> eintragen:{' '}
      <InlineCode>TWITCH_CLIENT_ID=…</InlineCode>
    </>,
    <>Auf „Mit Twitch verbinden" klicken — fertig.</>,
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: '0.875rem',
        color: '#777',
      }}
    >
      {steps.map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ color: '#9146FF', marginTop: 2, flexShrink: 0 }}>{i + 1}.</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  )
}

// ── Overlay links ─────────────────────────────────────────────────────────────

function OverlayLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 12,
        padding: '10px 16px',
        fontSize: '0.875rem',
        fontWeight: 500,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#ccc',
        textDecoration: 'none',
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: '0.75rem', color: '#555' }}>{desc} →</span>
    </a>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const auth = readAuth()
  const settings = readSettings()

  const authenticated = !!auth?.accessToken
  const channel = auth?.channelLogin ?? null
  const error = params.error
  const success = params.success === '1'
  const login = params.login ?? channel

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: '#0a0a0f',
        color: '#e0e0e0',
        fontFamily: 'var(--font-geist-sans)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          width: '100%',
          maxWidth: 448,
          borderRadius: 16,
          padding: 32,
          background: '#111118',
          border: '1px solid rgba(145,70,255,0.3)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TwitchLogo size={20} />
            <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>
              Stream Overlay Setup
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#888' }}>
            Verbinde deinen Twitch Account für Uptime und Viewer-Anzahl.
          </p>
        </div>

        {/* Auth status badges */}
        {success && login && (
          <StatusBadge variant="success">
            Verbunden als <strong>{login}</strong>
          </StatusBadge>
        )}
        {error && (
          <StatusBadge variant="error">{ERROR_MESSAGES[error] ?? `Fehler: ${error}`}</StatusBadge>
        )}
        {authenticated && !success && (
          <StatusBadge variant="info">
            Bereits verbunden{channel ? ` als ${channel}` : ''}
          </StatusBadge>
        )}

        {/* Connect button */}
        <a
          href="/api/auth/twitch"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderRadius: 12,
            padding: '12px 20px',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: '#9146FF',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          <TwitchLogo size={16} />
          {authenticated ? 'Erneut verbinden' : 'Mit Twitch verbinden'}
        </a>

        <Divider />

        <Section title="Voraussetzung">
          <SetupSteps appUrl={APP_URL} />
        </Section>

        <Section title="TopBar">
          <DauerwerbesendungToggle initialValue={settings.showDauerwerbesendung} />
        </Section>

        <Section title="Banner / Socials">
          <BannerSettings
            initial={
              {
                bannerEnabled: settings.bannerEnabled,
                bannerItems: settings.bannerItems,
                bannerInterval: settings.bannerInterval,
                bannerDuration: settings.bannerDuration,
                bannerPosition: settings.bannerPosition,
              } satisfies BannerConfig
            }
          />
        </Section>

        <Section title="Overlays & Screens">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {OVERLAYS.map((o) => (
              <OverlayLink key={o.href} {...o} />
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
