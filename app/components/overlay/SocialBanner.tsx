'use client'

import { useState, useEffect, useRef } from 'react'

interface BannerItem {
  text: string
  subtitle: string
  icon: string
  color: string
}

interface BannerConfig {
  enabled: boolean
  items: BannerItem[]
  interval: number
  duration: number
  position: 'top' | 'middle' | 'bottom'
}

type AnimPhase = 'hidden' | 'entering' | 'visible' | 'exiting'

const ENTER_MS = 560
const EXIT_MS = 360

const POSITION_MAP = {
  top: '20%',
  middle: '50%',
  bottom: '72%',
}

const KNOWN_PLATFORMS = [
  'twitch',
  'x',
  'twitter',
  'discord',
  'instagram',
  'tiktok',
  'youtube',
  'kick',
]

// Bootstrap Icons class names for known platforms
const BI_CLASS: Record<string, string> = {
  twitch: 'bi-twitch',
  x: 'bi-twitter-x',
  twitter: 'bi-twitter-x',
  discord: 'bi-discord',
  instagram: 'bi-instagram',
  tiktok: 'bi-tiktok',
  youtube: 'bi-youtube',
}

function PlatformIcon({ name, size = 28 }: { name: string; size?: number }) {
  const biClass = BI_CLASS[name]
  if (biClass) {
    return (
      <i className={`bi ${biClass}`} style={{ fontSize: size, color: '#fff', lineHeight: 1 }} />
    )
  }
  // Kick has no Bootstrap Icon — keep the custom SVG
  if (name === 'kick') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
        <path d="M1.5 0h21A1.5 1.5 0 0 1 24 1.5v21A1.5 1.5 0 0 1 22.5 24h-21A1.5 1.5 0 0 1 0 22.5v-21A1.5 1.5 0 0 1 1.5 0zm5 4.5v15H10V15l2 2 3.5 3h4L14 13l5-8.5h-4L11 10 10 9V4.5z" />
      </svg>
    )
  }
  return null
}

function BannerIcon({ icon }: { icon: string }) {
  if (!icon) return null
  const key = icon.toLowerCase().trim()
  if (KNOWN_PLATFORMS.includes(key)) return <PlatformIcon name={key} size={34} />
  if (key.startsWith('bi-')) {
    return <i className={`bi ${key}`} style={{ fontSize: 34, color: '#fff', lineHeight: 1 }} />
  }
  return <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{icon}</span>
}

export default function SocialBanner() {
  const [config, setConfig] = useState<BannerConfig | null>(null)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<AnimPhase>('hidden')
  const cancelRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        const items: BannerItem[] = Array.isArray(d.bannerItems)
          ? d.bannerItems.filter(
              (it: unknown) =>
                it &&
                typeof (it as BannerItem).text === 'string' &&
                (it as BannerItem).text.trim().length > 0
            )
          : []
        setConfig({
          enabled: d.bannerEnabled !== false,
          items,
          interval: Math.max(5, Number(d.bannerInterval) || 30),
          duration: Math.max(2, Number(d.bannerDuration) || 8),
          position: (d.bannerPosition as BannerConfig['position']) ?? 'middle',
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!config || !config.enabled || config.items.length === 0) return

    cancelRef.current = false
    let currentIndex = 0

    function delay(ms: number): Promise<void> {
      return new Promise((resolve) => {
        timerRef.current = setTimeout(() => {
          if (!cancelRef.current) resolve()
        }, ms)
      })
    }

    async function run() {
      await delay(3000)

      while (!cancelRef.current) {
        setIndex(currentIndex)
        setPhase('entering')
        await delay(ENTER_MS)
        if (cancelRef.current) break

        setPhase('visible')
        await delay(config!.duration * 1000)
        if (cancelRef.current) break

        setPhase('exiting')
        await delay(EXIT_MS)
        if (cancelRef.current) break

        setPhase('hidden')
        await delay(config!.interval * 1000)
        if (cancelRef.current) break

        currentIndex = (currentIndex + 1) % config!.items.length
      }
    }

    run()

    return () => {
      cancelRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      setPhase('hidden')
    }
  }, [config])

  if (!config || !config.enabled || config.items.length === 0) return null

  const item = config.items[index]
  const isOut = phase === 'hidden' || phase === 'exiting'
  const accentColor = item.color || '#9146FF'
  const hasIcon = Boolean(item.icon?.trim())

  const transition =
    phase === 'exiting'
      ? `transform ${EXIT_MS}ms cubic-bezier(0.36, 0, 0.66, 0)`
      : `transform ${ENTER_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: POSITION_MAP[config.position],
        transform: `translateY(-50%) translateX(${isOut ? 'calc(-100% - 4px)' : '0%'})`,
        transition,
        pointerEvents: 'none',
        zIndex: 100,
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '0 20px 20px 0',
        overflow: 'hidden',
        minHeight: 88,
        maxWidth: '70vw',
        boxShadow: '6px 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {/* Icon / accent section */}
      {hasIcon ? (
        <div
          style={{
            width: 84,
            flexShrink: 0,
            background: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BannerIcon icon={item.icon} />
        </div>
      ) : (
        <div style={{ width: 7, flexShrink: 0, background: accentColor }} />
      )}

      {/* Text section */}
      <div
        style={{
          background: 'rgba(6, 6, 12, 0.97)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 3,
          padding: '18px 36px 18px 24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          minWidth: 0,
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: '1.2rem',
            fontWeight: 700,
            letterSpacing: '0.015em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}
        >
          {item.text}
        </span>
        {item.subtitle && (
          <span
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.875rem',
              fontWeight: 400,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
            }}
          >
            {item.subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
