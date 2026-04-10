import { NextRequest, NextResponse } from 'next/server';
import { getTrackDetail } from '@/lib/music';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const track = await getTrackDetail(id);

  if (!track) {
    return NextResponse.json({ error: 'Track not found' }, { status: 404 });
  }

  return NextResponse.json({ track });
}
