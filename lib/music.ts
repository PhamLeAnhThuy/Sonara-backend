import { NextRequest } from 'next/server';
import { resolveUserFromBearer } from './auth';
import { createSupabaseServiceClient } from './supabase';

export type TrackSummary = {
  id: string;
  title: string;
  artistId: string;
  artistName: string;
  albumTitle: string | null;
  durationSeconds: number;
  artworkUrl: string;
  isRecommended: boolean;
  isTrending: boolean;
};

export type ArtistSummary = {
  id: string;
  name: string;
  bio: string;
  genre: string;
  imageUrl: string;
};

function toTrackSummary(track: Record<string, unknown>) {
  return {
    id: String(track.id),
    title: String(track.title),
    artistId: String(track.artist_id),
    artistName: String((track.artists as Record<string, unknown> | undefined)?.name ?? ''),
    albumTitle: (track.albums as Record<string, unknown> | null | undefined)?.title ? String((track.albums as Record<string, unknown>)?.title) : null,
    durationSeconds: Number(track.duration_seconds),
    artworkUrl: String(track.artwork_url ?? ''),
    isRecommended: Boolean(track.is_recommended),
    isTrending: Boolean(track.is_trending),
  } satisfies TrackSummary;
}

function toArtistSummary(artist: Record<string, unknown>) {
  return {
    id: String(artist.id),
    name: String(artist.name),
    bio: String(artist.bio ?? ''),
    genre: String(artist.genre ?? ''),
    imageUrl: String(artist.image_url ?? ''),
  } satisfies ArtistSummary;
}

export async function getHomeFeed(request: NextRequest) {
  const supabase = createSupabaseServiceClient();
  const user = await resolveUserFromBearer(request);

  const [recommendedResult, trendingResult, featuredArtistsResult] = await Promise.all([
    supabase
      .from('tracks')
      .select('id,title,artist_id,duration_seconds,artwork_url,is_recommended,is_trending,artists(name),albums(title)')
      .eq('is_public', true)
      .eq('is_recommended', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('tracks')
      .select('id,title,artist_id,duration_seconds,artwork_url,is_recommended,is_trending,artists(name),albums(title)')
      .eq('is_public', true)
      .eq('is_trending', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('artists')
      .select('id,name,bio,genre,image_url,is_featured')
      .eq('is_featured', true)
      .order('name', { ascending: true })
      .limit(12),
  ]);

  const recentListeningResult = user
    ? await supabase
        .from('play_history')
        .select('played_at, progress_seconds, tracks(id,title,artist_id,duration_seconds,artwork_url,artists(name),albums(title))')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(12)
    : { data: [], error: null };

  return {
    user,
    recommendedSongs: (recommendedResult.data ?? []).map(toTrackSummary),
    trendingSongs: (trendingResult.data ?? []).map(toTrackSummary),
    favouriteArtists: (featuredArtistsResult.data ?? []).map(toArtistSummary),
    recentListening: (recentListeningResult.data ?? []).map((row: Record<string, unknown>) => {
      const track = row.tracks as Record<string, unknown> | undefined;
      return {
        playedAt: String(row.played_at),
        progressSeconds: Number(row.progress_seconds),
        track: track
          ? {
              id: String(track.id),
              title: String(track.title),
              artistId: String(track.artist_id),
              durationSeconds: Number(track.duration_seconds),
              artworkUrl: String(track.artwork_url ?? ''),
              artistName: String((track.artists as Record<string, unknown> | undefined)?.name ?? ''),
              albumTitle: (track.albums as Record<string, unknown> | null | undefined)?.title ? String((track.albums as Record<string, unknown>)?.title) : null,
            }
          : null,
      };
    }),
  };
}

export async function searchCatalog(query: string) {
  const supabase = createSupabaseServiceClient();
  const normalized = query.trim();

  if (!normalized) {
    return { tracks: [], artists: [] };
  }

  const pattern = `%${normalized}%`;
  const [tracksResult, artistsResult] = await Promise.all([
    supabase
      .from('tracks')
      .select('id,title,artist_id,duration_seconds,artwork_url,is_recommended,is_trending,artists(name),albums(title)')
      .or(`title.ilike.${pattern},artwork_url.ilike.${pattern}`)
      .eq('is_public', true)
      .limit(20),
    supabase
      .from('artists')
      .select('id,name,bio,genre,image_url')
      .or(`name.ilike.${pattern},bio.ilike.${pattern},genre.ilike.${pattern}`)
      .limit(20),
  ]);

  return {
    tracks: (tracksResult.data ?? []).map(toTrackSummary),
    artists: (artistsResult.data ?? []).map(toArtistSummary),
  };
}

export async function getTrackDetail(trackId: string) {
  const supabase = createSupabaseServiceClient();
  const trackResult = await supabase
    .from('tracks')
    .select('id,title,artist_id,album_id,duration_seconds,track_number,artwork_url,audio_storage_path,audio_mime_type,is_public,artists(id,name,bio,genre,image_url),albums(id,title,cover_url),track_lyrics(id,line_order,start_ms,end_ms,lyric_text),track_assets(id,quality_label,storage_path,bitrate,mime_type,duration_seconds)')
    .eq('id', trackId)
    .maybeSingle();

  if (trackResult.error || !trackResult.data) {
    return null;
  }

  return trackResult.data;
}

export async function getTrackPlayback(trackId: string) {
  const supabase = createSupabaseServiceClient();
  const trackResult = await supabase
    .from('tracks')
    .select('id,title,artist_id,duration_seconds,artwork_url,audio_storage_path,audio_mime_type,artists(id,name,bio,genre,image_url),albums(id,title,cover_url)')
    .eq('id', trackId)
    .maybeSingle();

  if (trackResult.error || !trackResult.data) {
    return null;
  }

  const assetPath = trackResult.data.audio_storage_path;
  const signedUrlResult = await supabase.storage.from('track-audio').createSignedUrl(assetPath, 60 * 30);

  return {
    track: trackResult.data,
    signedUrl: signedUrlResult.data?.signedUrl ?? null,
    expiresAt: signedUrlResult.data?.expiration ? new Date(Date.now() + signedUrlResult.data.expiration * 1000).toISOString() : null,
  };
}

export async function listUserPlaylists(userId: string) {
  const supabase = createSupabaseServiceClient();
  const playlistsResult = await supabase
    .from('playlists')
    .select('id,name,description,is_public,created_at,updated_at,playlist_tracks(track_id,position,tracks(id,title,artist_id,duration_seconds,artwork_url,artists(name),albums(title)))')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  return playlistsResult.data ?? [];
}

export async function createUserPlaylist(userId: string, name: string, description = '') {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('playlists')
    .insert({ user_id: userId, name, description, is_public: false })
    .select('id,name,description,is_public,created_at,updated_at')
    .single();

  return result.data ?? null;
}

export async function updateUserPlaylist(userId: string, playlistId: string, name: string, description?: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('playlists')
    .update({ name, ...(description !== undefined ? { description } : {}) })
    .eq('id', playlistId)
    .eq('user_id', userId)
    .select('id,name,description,is_public,created_at,updated_at')
    .maybeSingle();

  return result.data ?? null;
}

export async function deleteUserPlaylist(userId: string, playlistId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase.from('playlists').delete().eq('id', playlistId).eq('user_id', userId);
  return !result.error;
}

export async function getPlaylistDetail(userId: string, playlistId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('playlists')
    .select('id,name,description,is_public,created_at,updated_at,playlist_tracks(position,tracks(id,title,artist_id,duration_seconds,artwork_url,artists(id,name,bio,genre,image_url),albums(id,title,cover_url)))')
    .eq('id', playlistId)
    .eq('user_id', userId)
    .maybeSingle();

  return result.data ?? null;
}

export async function addTrackToPlaylist(userId: string, playlistId: string, trackId: string) {
  const supabase = createSupabaseServiceClient();
  const existingResult = await supabase
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (existingResult.data?.position ?? 0) + 1;

  const result = await supabase.from('playlist_tracks').upsert({
    playlist_id: playlistId,
    track_id: trackId,
    position: nextPosition,
    added_by: userId,
  });

  return !result.error;
}

export async function removeTrackFromPlaylist(userId: string, playlistId: string, trackId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId)
    .in('playlist_id', [playlistId]);

  return !result.error;
}

export async function saveTrackForUser(userId: string, trackId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase.from('user_library').upsert({ user_id: userId, track_id: trackId });
  return !result.error;
}

export async function unsaveTrackForUser(userId: string, trackId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase.from('user_library').delete().eq('user_id', userId).eq('track_id', trackId);
  return !result.error;
}

export async function getArtistDetail(artistId: string) {
  const supabase = createSupabaseServiceClient();
  const result = await supabase
    .from('artists')
    .select('id,name,bio,genre,image_url,albums(id,title,cover_url,release_date),tracks(id,title,duration_seconds,artwork_url)')
    .eq('id', artistId)
    .maybeSingle();

  return result.data ?? null;
}
