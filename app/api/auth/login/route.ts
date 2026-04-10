import { NextRequest, NextResponse } from 'next/server';
import { loginWithPassword, readJsonBody } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 });
  }

  const { data, error } = await loginWithPassword(email, password);

  if (error || !data.session || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? 'Invalid credentials' },
      { status: 401 },
    );
  }

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.user_metadata?.display_name ?? data.user.email,
    },
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
  });
}
