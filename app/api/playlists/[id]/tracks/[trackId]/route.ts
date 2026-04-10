import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromBearer } from '@/lib/auth';
import { removeTrackFromPlaylist } from '@/lib/music';

type Params = { params: Promise<{ id: string; trackId: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: playlistId, trackId } = await params;
  const ok = await removeTrackFromPlaylist(user.id, playlistId, trackId);

  if (!ok) {
    return NextResponse.json({ error: 'Unable to remove track' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
