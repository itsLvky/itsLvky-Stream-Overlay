import { NextRequest, NextResponse } from 'next/server'
import { readSettings, updateSettings } from '@/lib/server-state'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(readSettings())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const updated = updateSettings({
    ...(body.showDauerwerbesendung !== undefined && {
      showDauerwerbesendung: Boolean(body.showDauerwerbesendung),
    }),
  })
  return NextResponse.json(updated)
}
