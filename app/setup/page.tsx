import { readAuth } from '@/lib/server-state'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function getAuthState(searchParams: Record<string, string>) {
  const auth = readAuth()
  const error = searchParams.error
  const success = searchParams.success === '1'
  const login = searchParams.login ?? auth?.channelLogin ?? null
  return {
    authenticated: !!auth?.accessToken,
    channel: auth?.channelLogin ?? null,
    error,
    success,
    login,
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  no_code: 'Kein Code von Twitch erhalten.',
  session_expired: 'Session abgelaufen — bitte erneut verbinden.',
  token_exchange_failed: 'Token-Austausch fehlgeschlagen. Client ID prüfen.',
  access_denied: 'Zugriff verweigert.',
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const { authenticated, channel, error, success, login } = getAuthState(params)

  return (
    <div
      className="flex min-h-screen items-center justify-center p-8"
      style={{ background: '#0a0a0f', color: '#e0e0e0', fontFamily: 'var(--font-geist-sans)' }}
    >
      <div
        className="flex w-full max-w-md flex-col gap-6 rounded-2xl p-8"
        style={{ background: '#111118', border: '1px solid rgba(145,70,255,0.3)' }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ color: '#9146FF' }}
            >
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
            </svg>
            <h1 className="text-lg font-bold" style={{ color: '#ffffff' }}>
              Stream Overlay Setup
            </h1>
          </div>
          <p className="text-sm" style={{ color: '#888' }}>
            Verbinde deinen Twitch Account für Uptime und Viewer-Anzahl.
          </p>
        </div>

        {/* Status */}
        {success && login && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              background: 'rgba(0,180,80,0.12)',
              border: '1px solid rgba(0,180,80,0.3)',
              color: '#4dff9e',
            }}
          >
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
            Verbunden als <strong>{login}</strong>
          </div>
        )}

        {error && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              background: 'rgba(255,60,60,0.12)',
              border: '1px solid rgba(255,60,60,0.3)',
              color: '#ff7070',
            }}
          >
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
            {ERROR_MESSAGES[error] ?? `Fehler: ${error}`}
          </div>
        )}

        {authenticated && !success && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
            style={{
              background: 'rgba(145,70,255,0.12)',
              border: '1px solid rgba(145,70,255,0.3)',
              color: '#bf7fff',
            }}
          >
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
            Bereits verbunden{channel ? ` als ${channel}` : ''}
          </div>
        )}

        {/* Connect button */}
        <a
          href="/api/auth/twitch"
          className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#9146FF', color: '#ffffff' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
          </svg>
          {authenticated ? 'Erneut verbinden' : 'Mit Twitch verbinden'}
        </a>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Info */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#555' }}>
            Voraussetzung
          </p>
          <div className="flex flex-col gap-2 text-sm" style={{ color: '#777' }}>
            <div className="flex items-start gap-2">
              <span style={{ color: '#9146FF', marginTop: 2 }}>1.</span>
              <span>
                Twitch App anlegen:{' '}
                <a
                  href="https://dev.twitch.tv/console/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#9146FF' }}
                >
                  dev.twitch.tv/console/apps
                </a>{' '}
                → OAuth Redirect URL:{' '}
                <code
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#ccc' }}
                >
                  {APP_URL}/api/auth/twitch/callback
                </code>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: '#9146FF', marginTop: 2 }}>2.</span>
              <span>
                Client ID in{' '}
                <code
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#ccc' }}
                >
                  .env.local
                </code>{' '}
                eintragen:{' '}
                <code
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#ccc' }}
                >
                  TWITCH_CLIENT_ID=…
                </code>
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: '#9146FF', marginTop: 2 }}>3.</span>
              <span>Auf „Mit Twitch verbinden" klicken — fertig.</span>
            </div>
          </div>
        </div>

        {/* Overlay links */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#555' }}>
            Overlays &amp; Screens
          </p>
          {[
            {
              href: '/overlay/just-chatting',
              label: 'Just Chatting',
              desc: 'Webcam + Chat + TopBar',
            },
            { href: '/overlay/topbar-only', label: 'TopBar Only', desc: 'Für Ingame / Desktop' },
            {
              href: '/overlay/stream-starting',
              label: 'Stream Starting',
              desc: 'Boot-Screen vor dem Stream',
            },
            { href: '/overlay/afk', label: 'AFK', desc: 'Session-suspended Screen' },
          ].map(({ href, label, desc }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#ccc',
              }}
            >
              <span>{label}</span>
              <span style={{ color: '#555', fontSize: '0.75rem' }}>{desc} →</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
