import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, resolveUserFromBearer } from '@/lib/auth';
import { createUserPlaylist, listUserPlaylists } from '@/lib/music';

export async function GET(request: NextRequest) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const playlists = await listUserPlaylists(user.id);
  return NextResponse.json({ playlists });
}

export async function POST(request: NextRequest) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJsonBody<{ name?: string; description?: string }>(request);
  const name = body?.name?.trim();
  const description = body?.description?.trim() ?? '';

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const playlist = await createUserPlaylist(user.id, name, description);

  if (!playlist) {
    return NextResponse.json({ error: 'Unable to create playlist' }, { status: 500 });
  }

  return NextResponse.json({ playlist }, { status: 201 });
}
