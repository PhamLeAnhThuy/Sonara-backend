import { NextRequest, NextResponse } from 'next/server';
import { resolveUserFromBearer } from '@/lib/auth';
import { createSupabaseServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const user = await resolveUserFromBearer(request);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseServiceClient();
  const [profileResult, playlistsResult, libraryResult, followsResult] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('playlists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('user_library').select('track_id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('follows').select('artist_id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: profileResult.data?.display_name ?? user.displayName,
      avatarUrl: profileResult.data?.avatar_url ?? user.avatarUrl,
    },
    counts: {
      playlists: playlistsResult.count ?? 0,
      savedTracks: libraryResult.count ?? 0,
      followedArtists: followsResult.count ?? 0,
    },
  });
}
