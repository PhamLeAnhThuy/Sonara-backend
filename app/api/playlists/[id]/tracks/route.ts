import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, resolveUserFromBearer } from '@/lib/auth';
import { addTrackToPlaylist } from '@/lib/music';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: playlistId } = await params;
  const body = await readJsonBody<{ trackId?: string }>(request);
  const trackId = body?.trackId?.trim();

  if (!trackId) {
    return NextResponse.json({ error: 'trackId is required' }, { status: 400 });
  }

  const ok = await addTrackToPlaylist(user.id, playlistId, trackId);

  if (!ok) {
    return NextResponse.json({ error: 'Unable to add track' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
