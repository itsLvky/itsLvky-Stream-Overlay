import type { StreamState } from './server-state'

// In-Process Pub/Sub zwischen dem EventSub-Listener und den SSE-Verbindungen
// der Overlays. Bewusst ohne externe Abhängigkeit: Server und Overlays laufen
// im selben Prozess auf dem Streaming-PC.

type Listener = (state: StreamState) => void

declare global {
  var __overlayListeners: Set<Listener> | undefined

  var __overlayLastPublished: string | undefined
}

function listeners(): Set<Listener> {
  if (!global.__overlayListeners) global.__overlayListeners = new Set()
  return global.__overlayListeners
}

export function subscribeStreamState(listener: Listener): () => void {
  const set = listeners()
  set.add(listener)
  return () => {
    set.delete(listener)
  }
}

export function publishStreamState(state: StreamState): void {
  // Jede Overlay-Seite schreibt z.B. den Viewer-Count — ohne Dedupe würde jeder
  // dieser Writes einen Broadcast an alle Sources auslösen.
  const serialized = JSON.stringify(state)
  if (serialized === global.__overlayLastPublished) return
  global.__overlayLastPublished = serialized

  for (const listener of listeners()) {
    try {
      listener(state)
    } catch {
      /* eine abgebrochene SSE-Verbindung darf die anderen nicht mitreißen */
    }
  }
}

export function streamStateListenerCount(): number {
  return listeners().size
}
