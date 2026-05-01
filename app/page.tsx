import { redirect } from 'next/navigation'

// Wurzel-URL → direkt zum Setup weiterleiten
export default function RootPage() {
  redirect('/setup')
}
