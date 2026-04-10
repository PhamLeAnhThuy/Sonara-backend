import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromBearer } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await resolveUserFromBearer(request);

  return NextResponse.json({
    ok: true,
    userId: user?.id ?? null,
    message: 'Client should drop access and refresh tokens after sign out.',
  });
}
