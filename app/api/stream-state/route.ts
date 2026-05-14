import { NextRequest, NextResponse } from 'next/server'
import { getStreamState, updateStreamState } from '@/lib/server-state'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(getStreamState())
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const updated = updateStreamState({
    ...(body.gameName !== undefined && { gameName: body.gameName }),
    ...(body.streamStartedAt !== undefined && { streamStartedAt: body.streamStartedAt }),
    ...(body.viewerCount !== undefined && { viewerCount: body.viewerCount }),
    ...(body.lastFollower !== undefined && { lastFollower: body.lastFollower }),
    ...(body.lastSubscriber !== undefined && { lastSubscriber: body.lastSubscriber }),
    ...(body.lastBits !== undefined && { lastBits: body.lastBits }),
    ...(body.lastDonation !== undefined && { lastDonation: body.lastDonation }),
    ...(body.lastRedemption !== undefined && { lastRedemption: body.lastRedemption }),
  })
  return NextResponse.json(updated)
}
