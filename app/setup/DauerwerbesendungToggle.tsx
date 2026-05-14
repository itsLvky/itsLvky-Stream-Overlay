'use client'

import { useState, useTransition } from 'react'

export default function DauerwerbesendungToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showDauerwerbesendung: next }),
      })
    })
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: `1px solid ${enabled ? 'rgba(145,70,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
        color: '#ccc',
        cursor: 'pointer',
      }}
    >
      <span>Dauerwerbesendung</span>
      <span
        className="flex h-5 w-9 items-center rounded-full transition-colors"
        style={{ background: enabled ? '#9146FF' : 'rgba(255,255,255,0.15)' }}
      >
        <span
          className="mx-0.5 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </span>
    </button>
  )
}
