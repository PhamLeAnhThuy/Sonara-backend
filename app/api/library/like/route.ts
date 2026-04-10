import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, resolveUserFromBearer } from '@/lib/auth';
import { saveTrackForUser, unsaveTrackForUser } from '@/lib/music';

export async function POST(request: NextRequest) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJsonBody<{ trackId?: string }>(request);
  const trackId = body?.trackId?.trim();

  if (!trackId) {
    return NextResponse.json({ error: 'trackId is required' }, { status: 400 });
  }

  const ok = await saveTrackForUser(user.id, trackId);

  if (!ok) {
    return NextResponse.json({ error: 'Unable to save track' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJsonBody<{ trackId?: string }>(request);
  const trackId = body?.trackId?.trim();

  if (!trackId) {
    return NextResponse.json({ error: 'trackId is required' }, { status: 400 });
  }

  const ok = await unsaveTrackForUser(user.id, trackId);

  if (!ok) {
    return NextResponse.json({ error: 'Unable to unsave track' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
