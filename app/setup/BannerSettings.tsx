'use client'

import { useState, useTransition, useRef } from 'react'
import type { BannerItem, BannerConfig } from './banner-types'

// ── Constants ─────────────────────────────────────────────────────────────────

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

const PLATFORM_OPTIONS = [
  { value: '', label: '— Kein Icon —' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'x', label: 'Twitter / X' },
  { value: 'discord', label: 'Discord' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'kick', label: 'Kick' },
  { value: '_emoji', label: 'Emoji / Text…' },
]

const PRESET_COLORS = [
  '#9146FF',
  '#1d9bf0',
  '#5865f2',
  '#e1306c',
  '#ff0050',
  '#ff0000',
  '#53fc18',
  '#ff6b00',
]

const S = {
  fieldInput: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '6px 10px',
    fontSize: '0.8125rem',
    color: '#ccc',
    outline: 'none',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  fieldSelect: {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '6px 28px 6px 10px',
    fontSize: '0.8125rem',
    color: '#ccc',
    outline: 'none',
    appearance: 'none' as const,
    cursor: 'pointer',
  } as React.CSSProperties,
  label: {
    fontSize: '0.75rem',
    color: '#555',
  } as React.CSSProperties,
} as const

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  pending,
  onToggle,
}: {
  enabled: boolean
  pending: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      disabled={pending}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: '0.875rem',
        fontWeight: 500,
        background: 'rgba(255,255,255,0.06)',
        border: enabled ? '1px solid rgba(145,70,255,0.4)' : '1px solid rgba(255,255,255,0.1)',
        color: '#ccc',
        cursor: pending ? 'default' : 'pointer',
        opacity: pending ? 0.5 : 1,
      }}
    >
      <span>Banner aktiviert</span>
      <span
        style={{
          display: 'flex',
          height: 20,
          width: 36,
          alignItems: 'center',
          borderRadius: 9999,
          background: enabled ? '#9146FF' : 'rgba(255,255,255,0.15)',
          transition: 'background-color 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            margin: '0 2px',
            height: 16,
            width: 16,
            borderRadius: '50%',
            background: 'white',
            transform: enabled ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform 0.2s',
          }}
        />
      </span>
    </button>
  )
}

// ── Color picker ──────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            border: value === c ? '2px solid #fff' : '2px solid transparent',
            outline: value === c ? '1px solid rgba(255,255,255,0.35)' : 'none',
            padding: 0,
            cursor: 'pointer',
            background: c,
            flexShrink: 0,
          }}
          title={c}
        />
      ))}
      <label
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          border: '2px solid rgba(255,255,255,0.2)',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
          display: 'block',
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            opacity: 0,
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            padding: 0,
            border: 'none',
          }}
        />
      </label>
      <span
        style={{
          display: 'block',
          width: 22,
          height: 22,
          borderRadius: 5,
          border: '1px solid rgba(255,255,255,0.15)',
          background: value,
          flexShrink: 0,
        }}
      />
    </div>
  )
}

// ── Item editor ───────────────────────────────────────────────────────────────

function ItemEditor({
  item,
  onUpdate,
  onRemove,
}: {
  item: BannerItem
  onUpdate: (patch: Partial<BannerItem>) => void
  onRemove: () => void
}) {
  const iconSelect = KNOWN_PLATFORMS.includes(item.icon.toLowerCase())
    ? item.icon.toLowerCase()
    : item.icon
      ? '_emoji'
      : ''

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderRadius: 12,
        padding: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <input
        type="text"
        value={item.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="z.B. Folge mir auf Twitter!"
        style={S.fieldInput}
      />
      <input
        type="text"
        value={item.subtitle}
        onChange={(e) => onUpdate({ subtitle: e.target.value })}
        placeholder="Untertitel (optional) · z.B. @deinname"
        style={{ ...S.fieldInput, color: '#888' }}
      />

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <span style={S.label}>Icon</span>
          <select
            value={iconSelect}
            onChange={(e) => {
              const v = e.target.value
              onUpdate({ icon: v === '_emoji' ? '' : v })
            }}
            style={S.fieldSelect}
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {iconSelect === '_emoji' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '0 0 64px' }}>
            <span style={S.label}>Emoji</span>
            <input
              type="text"
              value={item.icon}
              onChange={(e) => onUpdate({ icon: e.target.value })}
              placeholder="🎮"
              style={{ ...S.fieldInput, textAlign: 'center', fontSize: '1.1rem' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          <span style={S.label}>&zwnj;</span>
          <button
            onClick={onRemove}
            style={{
              height: 32,
              width: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              fontSize: '1.1rem',
              background: 'rgba(255,60,60,0.1)',
              border: '1px solid rgba(255,60,60,0.2)',
              color: '#ff7070',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={S.label}>Hintergrundfarbe</span>
        <ColorPicker value={item.color} onChange={(c) => onUpdate({ color: c })} />
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function BannerSettings({ initial }: { initial: BannerConfig }) {
  const [enabled, setEnabled] = useState(initial.bannerEnabled)
  const [items, setItems] = useState<BannerItem[]>(initial.bannerItems)
  const [interval, setIntervalVal] = useState(initial.bannerInterval)
  const [duration, setDuration] = useState(initial.bannerDuration)
  const [position, setPosition] = useState(initial.bannerPosition)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showSaved() {
    setSaved(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  function saveAll(overrides?: Partial<BannerConfig>) {
    const payload = {
      bannerEnabled: enabled,
      bannerItems: items,
      bannerInterval: interval,
      bannerDuration: duration,
      bannerPosition: position,
      ...overrides,
    }
    startTransition(async () => {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      showSaved()
    })
  }

  function toggleEnabled() {
    const next = !enabled
    setEnabled(next)
    saveAll({ bannerEnabled: next })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Toggle enabled={enabled} pending={pending} onToggle={toggleEnabled} />

      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={S.label}>Anzeigedauer (s)</span>
          <input
            type="number"
            min={2}
            max={60}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={S.fieldInput}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={S.label}>Pause (s)</span>
          <input
            type="number"
            min={5}
            max={600}
            value={interval}
            onChange={(e) => setIntervalVal(Number(e.target.value))}
            style={S.fieldInput}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <span style={S.label}>Position</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as BannerConfig['bannerPosition'])}
            style={S.fieldSelect}
          >
            <option value="top">Oben</option>
            <option value="middle">Mitte</option>
            <option value="bottom">Unten</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, i) => (
          <ItemEditor
            key={i}
            item={item}
            onUpdate={(patch) =>
              setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
            }
            onRemove={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <button
          onClick={() =>
            setItems((prev) => [...prev, { text: '', subtitle: '', icon: '', color: '#9146FF' }])
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            padding: '8px 16px',
            fontSize: '0.875rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.15)',
            color: '#666',
            cursor: 'pointer',
          }}
        >
          + Eintrag hinzufügen
        </button>
      </div>

      <button
        onClick={() => saveAll()}
        disabled={pending}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          background: saved ? 'rgba(0,180,80,0.2)' : 'rgba(145,70,255,0.2)',
          border: saved ? '1px solid rgba(0,180,80,0.4)' : '1px solid rgba(145,70,255,0.35)',
          color: saved ? '#4dff9e' : '#bf7fff',
          cursor: pending ? 'default' : 'pointer',
          opacity: pending ? 0.5 : 1,
        }}
      >
        {saved ? '✓ Gespeichert' : 'Speichern'}
      </button>
    </div>
  )
}
