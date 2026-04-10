import { NextRequest, NextResponse } from 'next/server';
import { getTrackPlayback } from '@/lib/music';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const playback = await getTrackPlayback(id);

  if (!playback) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  return NextResponse.json(playback);
}
