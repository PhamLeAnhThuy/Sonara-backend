import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, registerWithProfile } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password?.trim();
  const displayName = body?.displayName?.trim();

  if (!email || !password || !displayName) {
    return NextResponse.json({ error: 'displayName, email, and password are required' }, { status: 400 });
  }

  const { error, user } = await registerWithProfile(email, password, displayName);

  if (error || !user) {
    return NextResponse.json({ error: error?.message ?? 'Unable to register user' }, { status: 400 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName,
    },
  }, { status: 201 });
}
