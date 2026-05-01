'use client'

import { useEffect, useRef } from 'react'
import { useStreamerbot } from './StreamerbotContext'
import ChatMessageRow from './ChatMessage'

export default function ChatPanel() {
  const { messages, connected } = useStreamerbot()
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages])

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden"
      style={{
        width: '460px',
        background: 'rgba(5, 5, 10, 0.88)',
        borderLeft: '2px solid rgba(145, 70, 255, 0.40)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Terminal header bar */}
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-2 font-mono"
        style={{
          borderBottom: '1px solid rgba(145, 70, 255, 0.25)',
          background: 'rgba(145, 70, 255, 0.08)',
        }}
      >
        {/* Traffic-light dots */}
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="h-3 w-3 rounded-full" style={{ background: '#febc2e' }} />
          <span className="h-3 w-3 rounded-full" style={{ background: '#28c840' }} />
        </span>
        <span className="ml-2 text-sm font-semibold" style={{ color: '#aaaaaa' }}>
          chat@twitch:~
        </span>
        <span className="ml-auto text-sm" style={{ color: '#444' }}>
          {messages.length} msgs
        </span>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-x-hidden overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-1 p-4 font-mono" style={{ fontSize: '1rem' }}>
            <span style={{ color: '#9146FF' }}>
              $ <span style={{ color: '#555' }}>warte auf nachrichten…</span>
            </span>
            {!connected && (
              <span style={{ color: '#444' }}>
                $ <span style={{ color: '#333' }}>StreamerBot WS-Server auf Port 8080 starten</span>
              </span>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id}>
            <ChatMessageRow msg={msg} />
            {i < messages.length - 1 && (
              <div
                style={{ borderBottom: '1px solid rgba(145, 70, 255, 0.06)', margin: '0 16px' }}
              />
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
