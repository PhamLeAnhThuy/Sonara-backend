import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, resolveUserFromBearer } from '@/lib/auth';
import { deleteUserPlaylist, getPlaylistDetail, updateUserPlaylist } from '@/lib/music';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const playlist = await getPlaylistDetail(user.id, id);

  if (!playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
  }

  return NextResponse.json({ playlist });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJsonBody<{ name?: string; description?: string }>(request);
  const { id } = await params;

  if (!body?.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const playlist = await updateUserPlaylist(user.id, id, body.name.trim(), body.description?.trim());

  if (!playlist) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
  }

  return NextResponse.json({ playlist });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteUserPlaylist(user.id, id);

  if (!deleted) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
