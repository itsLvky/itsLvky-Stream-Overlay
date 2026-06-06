import { getStreamState } from '@/lib/server-state'
import UltrawideContent from './UltrawideContent'

export default function UltrawidePage() {
  const initialState = getStreamState()
  return <UltrawideContent initialState={initialState} />
}
