import { getStreamState } from '@/lib/server-state'
import AfkContent from './AfkContent'

// Ohne das prerendert Next die Seite zur Build-Zeit und liefert dauerhaft
// den Stand aus der DB von damals aus. Die SSE-Verbindung korrigiert das
// zwar sofort, aber erst nach dem ersten Frame.
export const dynamic = 'force-dynamic'

export default function AfkPage() {
  const initialState = getStreamState()
  return <AfkContent initialState={initialState} />
}
