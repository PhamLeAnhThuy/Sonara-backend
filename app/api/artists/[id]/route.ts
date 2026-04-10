import { NextRequest, NextResponse } from 'next/server';
import { getArtistDetail } from '@/lib/music';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const artist = await getArtistDetail(id);

  if (!artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  }

  return NextResponse.json({ artist });
}
