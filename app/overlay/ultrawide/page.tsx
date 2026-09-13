import { getStreamState } from '@/lib/server-state'
import UltrawideContent from './UltrawideContent'

// Ohne das prerendert Next die Seite zur Build-Zeit und liefert dauerhaft
// den Stand aus der DB von damals aus. Die SSE-Verbindung korrigiert das
// zwar sofort, aber erst nach dem ersten Frame.
export const dynamic = 'force-dynamic'

export default function UltrawidePage() {
  const initialState = getStreamState()
  return <UltrawideContent initialState={initialState} />
}
