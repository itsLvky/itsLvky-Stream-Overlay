'use client'

import { useStreamerbot } from './StreamerbotContext'

function EventModule({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-2 px-4 py-0"
      style={{
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 font-mono text-sm font-medium" style={{ color: '#bf7fff' }}>
      {children}
    </span>
  )
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <span className="truncate font-mono text-sm font-semibold" style={{ color: '#ffffff' }}>
      {children}
    </span>
  )
}

function Placeholder() {
  return (
    <span className="font-mono text-sm" style={{ color: '#444' }}>
      —
    </span>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function FollowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ color: '#bf7fff' }}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

function SubIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ color: '#bf7fff' }}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function BitsIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="shrink-0"
      style={{ color: '#bf7fff' }}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
}

function DonationIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ color: '#bf7fff' }}
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function RedemptionIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ color: '#bf7fff' }}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export default function EventBar() {
  const { lastFollower, lastSubscriber, lastBits, lastDonation, lastRedemption } = useStreamerbot()

  return (
    <div
      className="flex shrink-0 items-stretch"
      style={{
        height: '48px',
        background: 'rgba(6, 6, 12, 0.88)',
        borderBottom: '1px solid rgba(145, 70, 255, 0.28)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <EventModule>
        <FollowIcon />
        <Label>Follower</Label>
        {lastFollower ? <Value>{lastFollower}</Value> : <Placeholder />}
      </EventModule>

      <EventModule>
        <SubIcon />
        <Label>Sub</Label>
        {lastSubscriber ? <Value>{lastSubscriber}</Value> : <Placeholder />}
      </EventModule>

      <EventModule>
        <BitsIcon />
        <Label>Bits</Label>
        {lastBits ? (
          <Value>
            {lastBits.username}{' '}
            <span style={{ color: '#aaaaaa' }}>({lastBits.amount.toLocaleString('de-DE')})</span>
          </Value>
        ) : (
          <Placeholder />
        )}
      </EventModule>

      <EventModule>
        <DonationIcon />
        <Label>Donation</Label>
        {lastDonation ? (
          <Value>
            {lastDonation.username}{' '}
            <span style={{ color: '#aaaaaa' }}>
              ({lastDonation.amount} {lastDonation.currency})
            </span>
          </Value>
        ) : (
          <Placeholder />
        )}
      </EventModule>

      <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <RedemptionIcon />
        <Label>Reward</Label>
        {lastRedemption ? (
          <Value>
            {lastRedemption.username}{' '}
            <span style={{ color: '#aaaaaa' }}>({lastRedemption.title})</span>
          </Value>
        ) : (
          <Placeholder />
        )}
      </div>
    </div>
  )
}
