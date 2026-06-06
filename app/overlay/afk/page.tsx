import { getStreamState } from '@/lib/server-state'
import AfkContent from './AfkContent'

export default function AfkPage() {
  const initialState = getStreamState()
  return <AfkContent initialState={initialState} />
}
