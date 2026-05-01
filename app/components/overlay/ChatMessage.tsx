'use client'

import Image from 'next/image'
import type { ChatMessage, ChatEmote } from './StreamerbotContext'

type TextPart = { kind: 'text'; content: string }
type EmotePart = { kind: 'emote'; name: string; url: string }
type MessagePart = TextPart | EmotePart

function parseParts(message: string, emotes: ChatEmote[]): MessagePart[] {
  if (!emotes.length) return [{ kind: 'text', content: message }]

  const sorted = [...emotes].sort((a, b) => a.startIndex - b.startIndex)
  const parts: MessagePart[] = []
  let cursor = 0

  for (const emote of sorted) {
    if (emote.startIndex > cursor) {
      parts.push({ kind: 'text', content: message.slice(cursor, emote.startIndex) })
    }
    parts.push({ kind: 'emote', name: emote.name, url: emote.imageUrl })
    cursor = emote.endIndex + 1
  }

  if (cursor < message.length) {
    parts.push({ kind: 'text', content: message.slice(cursor) })
  }

  return parts
}

// Badge symbol shown as colored prefix character
function badgeChar(type: string): { char: string; color: string } | null {
  const map: Record<string, { char: string; color: string }> = {
    broadcaster: { char: '@', color: '#ff4444' },
    moderator: { char: '%', color: '#00dd44' },
    vip: { char: '+', color: '#dd00cc' },
    subscriber: { char: '~', color: '#9146FF' },
  }
  return map[type.toLowerCase()] ?? null
}

export default function ChatMessageRow({ msg }: { msg: ChatMessage }) {
  const parts = parseParts(msg.message, msg.emotes)

  // Pick the highest-priority badge for the prompt prefix
  const badgePriority = ['broadcaster', 'moderator', 'vip', 'subscriber']
  const topBadge = msg.badges
    .filter((b) => b?.name)
    .sort(
      (a, b) =>
        badgePriority.indexOf(a.name.toLowerCase()) - badgePriority.indexOf(b.name.toLowerCase())
    )[0]

  const badge = topBadge
    ? badgeChar(topBadge.name)
    : msg.isBroadcaster
      ? badgeChar('broadcaster')
      : msg.isMod
        ? badgeChar('moderator')
        : msg.isVip
          ? badgeChar('vip')
          : msg.isSub
            ? badgeChar('subscriber')
            : null

  return (
    <div
      className="overlay-message px-4 py-2.5 font-mono leading-relaxed break-words"
      style={{ fontSize: '1.125rem' /* 18px */ }}
    >
      {/* Prompt line: [badge]username@twitch:~$ message */}
      <span>
        {/* Badge prefix char */}
        {badge && (
          <span className="font-bold" style={{ color: badge.color }}>
            {badge.char}
          </span>
        )}

        {/* Username */}
        <span className="font-bold" style={{ color: msg.color || '#9146FF' }}>
          {msg.displayName}
        </span>

        {/* Shell prompt suffix */}
        <span style={{ color: '#9146FF' }}>@twitch</span>
        <span style={{ color: '#5a5a7a' }}>:~</span>
        <span className="font-bold" style={{ color: '#5a5a7a' }}>
          ${' '}
        </span>

        {/* Message content */}
        {parts.map((part, i) =>
          part.kind === 'text' ? (
            <span key={i} style={{ color: '#ffffff' }}>
              {part.content}
            </span>
          ) : (
            <Image
              key={i}
              src={part.url}
              alt={part.name}
              width={24}
              height={24}
              className="mx-0.5 inline-block align-middle"
              unoptimized
            />
          )
        )}
      </span>
    </div>
  )
}
