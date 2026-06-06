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
    ...(body.bannerEnabled !== undefined && { bannerEnabled: Boolean(body.bannerEnabled) }),
    ...(Array.isArray(body.bannerItems) && {
      bannerItems: body.bannerItems as import('@/lib/server-state').BannerItem[],
    }),
    ...(body.bannerPosition !== undefined && {
      bannerPosition: body.bannerPosition as 'top' | 'middle' | 'bottom',
    }),
    ...(body.bannerInterval !== undefined && { bannerInterval: Number(body.bannerInterval) }),
    ...(body.bannerDuration !== undefined && { bannerDuration: Number(body.bannerDuration) }),
  })
  return NextResponse.json(updated)
}
