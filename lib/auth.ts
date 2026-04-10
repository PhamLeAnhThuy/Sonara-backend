import { NextRequest } from 'next/server';
import { createSupabaseAnonClient, createSupabaseServiceClient } from './supabase';

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export type JsonAuthBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get('authorization') ?? request.headers.get('Authorization');

  if (!header) {
    return null;
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function readJsonBody<T extends JsonAuthBody = JsonAuthBody>(request: NextRequest) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export async function resolveUserFromBearer(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  const profileQuery = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', data.user.id)
    .maybeSingle();

  return {
    id: data.user.id,
    email: data.user.email ?? '',
    displayName: profileQuery.data?.display_name ?? data.user.user_metadata?.display_name ?? data.user.email ?? '',
    avatarUrl: profileQuery.data?.avatar_url ?? null,
  } satisfies AuthenticatedUser;
}

export async function loginWithPassword(email: string, password: string) {
  const supabase = createSupabaseAnonClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function registerWithProfile(email: string, password: string, displayName: string) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error || !data.user) {
    return { error: error ?? new Error('Unable to create user account.'), user: null };
  }

  const profileInsert = await supabase.from('profiles').upsert({
    id: data.user.id,
    display_name: displayName,
    avatar_url: data.user.user_metadata?.avatar_url ?? null,
  });

  if (profileInsert.error) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return { error: profileInsert.error, user: null };
  }

  return { error: null, user: data.user };
}
