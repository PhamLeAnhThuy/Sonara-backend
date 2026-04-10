import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

type IngestArtist = {
  name: string;
  bio?: string;
  genre?: string;
  imageUrl?: string;
  popularity?: number;
};

type IngestAlbum = {
  title: string;
  coverUrl?: string;
  releaseDate?: string;
};

type IngestTrack = {
  title: string;
  durationSeconds: number;
  trackNumber?: number;
  artworkUrl?: string;
  audioStoragePath?: string;
  audioMimeType?: string;
  explicit?: boolean;
  popularityScore?: number;
};

type IngestAsset = {
  qualityLabel: string;
  storagePath: string;
  mimeType?: string;
  bitrate?: number;
  durationSeconds: number;
};

type IngestLyric = {
  lineOrder: number;
  startMs: number;
  endMs?: number;
  lyricText: string;
};

type IngestItem = {
  artist: IngestArtist;
  album?: IngestAlbum;
  track: IngestTrack;
  assets?: IngestAsset[];
  lyrics?: IngestLyric[];
};

type IngestBody = {
  items?: IngestItem[];
  dryRun?: boolean;
};

function normalizeItem(raw: IngestItem | Record<string, unknown>): IngestItem {
  const item = (raw ?? {}) as Record<string, unknown>;
  const artist = (item.artist ?? {}) as Record<string, unknown>;
  const album = (item.album ?? {}) as Record<string, unknown>;
  const track = (item.track ?? {}) as Record<string, unknown>;

  const rawGenres = artist.genre ?? artist.genres;
  const genre = Array.isArray(rawGenres)
    ? rawGenres.filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean).join(', ')
    : typeof rawGenres === 'string'
      ? rawGenres.trim()
      : '';

  const durationSeconds = Number.isInteger(track.durationSeconds)
    ? Number(track.durationSeconds)
    : Number.isInteger(track.durationMs)
      ? Math.ceil(Number(track.durationMs) / 1000)
      : Number(track.durationSeconds) || 0;

  const rawLyrics = item.lyrics;
  let lyrics: IngestLyric[] = [];

  if (typeof rawLyrics === 'string' && rawLyrics.trim()) {
    lyrics = [{ lineOrder: 1, startMs: 0, lyricText: rawLyrics.trim() }];
  } else if (Array.isArray(rawLyrics)) {
    const lyricText = rawLyrics
      .map(entry => {
        if (typeof entry === 'string') {
          return entry.trim();
        }

        if (entry && typeof entry === 'object') {
          return String((entry as Record<string, unknown>).lyricText ?? '').trim();
        }

        return '';
      })
      .filter(Boolean)
      .join('\n');

    if (lyricText) {
      lyrics = [{ lineOrder: 1, startMs: 0, lyricText }];
    }
  }

  return {
    artist: {
      name: String(artist.name ?? ''),
      bio: typeof artist.bio === 'string' ? artist.bio : undefined,
      genre,
      imageUrl: typeof artist.imageUrl === 'string' ? artist.imageUrl : undefined,
      popularity: Number.isInteger(artist.popularity) ? Number(artist.popularity) : undefined,
    },
    album: Object.keys(album).length
      ? {
          title: String(album.title ?? ''),
          coverUrl: typeof album.coverUrl === 'string' ? album.coverUrl : undefined,
          releaseDate: typeof album.releaseDate === 'string' ? album.releaseDate : undefined,
        }
      : undefined,
    track: {
      title: String(track.title ?? ''),
      durationSeconds,
      trackNumber: Number.isInteger(track.trackNumber) ? Number(track.trackNumber) : undefined,
      artworkUrl: typeof track.artworkUrl === 'string' ? track.artworkUrl : undefined,
      audioStoragePath: typeof track.audioStoragePath === 'string' ? track.audioStoragePath : undefined,
      audioMimeType: typeof track.audioMimeType === 'string' ? track.audioMimeType : undefined,
      explicit: typeof track.explicit === 'boolean' ? track.explicit : undefined,
      popularityScore: Number.isInteger(track.popularityScore) ? Number(track.popularityScore) : undefined,
    },
    assets: Array.isArray(item.assets) ? (item.assets as IngestAsset[]) : [],
    lyrics,
  };
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function validateItem(item: IngestItem, index: number) {
  const errors: string[] = [];

  if (!item.artist?.name?.trim()) {
    errors.push(`items[${index}].artist.name is required`);
  }

  if (!item.track?.title?.trim()) {
    errors.push(`items[${index}].track.title is required`);
  }

  if (!Number.isInteger(item.track?.durationSeconds) || Number(item.track?.durationSeconds) <= 0) {
    errors.push(`items[${index}].track.durationSeconds must be an integer > 0`);
  }

  if (!item.track?.audioStoragePath?.trim()) {
    errors.push(`items[${index}].track.audioStoragePath is required`);
  }

  for (const [assetIndex, asset] of (item.assets ?? []).entries()) {
    if (!asset.qualityLabel?.trim()) {
      errors.push(`items[${index}].assets[${assetIndex}].qualityLabel is required`);
    }

    if (!asset.storagePath?.trim()) {
      errors.push(`items[${index}].assets[${assetIndex}].storagePath is required`);
    }

    if (!Number.isInteger(asset.durationSeconds) || asset.durationSeconds <= 0) {
      errors.push(`items[${index}].assets[${assetIndex}].durationSeconds must be an integer > 0`);
    }
  }

  for (const [lyricIndex, lyric] of (item.lyrics ?? []).entries()) {
    if (!Number.isInteger(lyric.lineOrder) || lyric.lineOrder < 1) {
      errors.push(`items[${index}].lyrics[${lyricIndex}].lineOrder must be an integer >= 1`);
    }

    if (!Number.isInteger(lyric.startMs) || lyric.startMs < 0) {
      errors.push(`items[${index}].lyrics[${lyricIndex}].startMs must be an integer >= 0`);
    }

    if (lyric.endMs !== undefined && (!Number.isInteger(lyric.endMs) || lyric.endMs < 0)) {
      errors.push(`items[${index}].lyrics[${lyricIndex}].endMs must be an integer >= 0`);
    }

    if (!lyric.lyricText?.trim()) {
      errors.push(`items[${index}].lyrics[${lyricIndex}].lyricText is required`);
    }
  }

  return errors;
}

async function getOrCreateArtist(item: IngestItem) {
  const supabase = createSupabaseServiceClient();
  const artistName = item.artist.name.trim();
  const existing = await supabase.from('artists').select('id').eq('name', artistName).limit(1).maybeSingle();

  if (existing.data?.id) {
    return { artistId: existing.data.id, error: null };
  }

  const inserted = await supabase
    .from('artists')
    .insert({
      name: artistName,
      bio: item.artist.bio?.trim() ?? '',
      genre: item.artist.genre?.trim() ?? '',
      image_url: item.artist.imageUrl?.trim() ?? '',
      popularity: Number.isInteger(item.artist.popularity) ? item.artist.popularity : 0,
    })
    .select('id')
    .single();

  return { artistId: inserted.data?.id ?? null, error: inserted.error };
}

async function getOrCreateAlbum(item: IngestItem, artistId: string) {
  if (!item.album?.title?.trim()) {
    return { albumId: null, error: null };
  }

  const supabase = createSupabaseServiceClient();
  const albumTitle = item.album.title.trim();

  const existing = await supabase
    .from('albums')
    .select('id')
    .eq('artist_id', artistId)
    .eq('title', albumTitle)
    .limit(1)
    .maybeSingle();

  if (existing.data?.id) {
    return { albumId: existing.data.id, error: null };
  }

  const inserted = await supabase
    .from('albums')
    .insert({
      artist_id: artistId,
      title: albumTitle,
      cover_url: item.album.coverUrl?.trim() ?? '',
      release_date: item.album.releaseDate ?? null,
    })
    .select('id')
    .single();

  return { albumId: inserted.data?.id ?? null, error: inserted.error };
}

async function insertTrackGraph(item: IngestItem) {
  const artistResult = await getOrCreateArtist(item);

  if (!artistResult.artistId || artistResult.error) {
    return { ok: false, error: artistResult.error?.message ?? 'Unable to create or resolve artist' };
  }

  const albumResult = await getOrCreateAlbum(item, artistResult.artistId);

  if (albumResult.error) {
    return { ok: false, error: albumResult.error.message };
  }

  const supabase = createSupabaseServiceClient();
  const trackInsert = await supabase
    .from('tracks')
    .insert({
      artist_id: artistResult.artistId,
      album_id: albumResult.albumId,
      title: item.track.title.trim(),
      duration_seconds: item.track.durationSeconds,
      track_number: item.track.trackNumber ?? null,
      artwork_url: item.track.artworkUrl?.trim() ?? '',
      audio_storage_path: item.track.audioStoragePath?.trim() ?? '',
      audio_mime_type: item.track.audioMimeType?.trim() ?? 'audio/mpeg',
      explicit: toBoolean(item.track.explicit, false),
      popularity_score: Number.isInteger(item.track.popularityScore) ? item.track.popularityScore : 0,
    })
    .select('id')
    .single();

  if (!trackInsert.data?.id || trackInsert.error) {
    return { ok: false, error: trackInsert.error?.message ?? 'Unable to insert track' };
  }

  const trackId = trackInsert.data.id;

  if (item.assets?.length) {
    const assetsInsert = await supabase.from('track_assets').insert(
      item.assets.map(asset => ({
        track_id: trackId,
        quality_label: asset.qualityLabel.trim(),
        storage_path: asset.storagePath.trim(),
        bitrate: asset.bitrate ?? null,
        mime_type: asset.mimeType?.trim() ?? 'audio/mpeg',
        duration_seconds: asset.durationSeconds,
      })),
    );

    if (assetsInsert.error) {
      return { ok: false, error: assetsInsert.error.message, trackId };
    }
  }

  if (item.lyrics?.length) {
    const lyricsInsert = await supabase.from('track_lyrics').insert(
      item.lyrics
        .slice()
        .sort((a, b) => a.lineOrder - b.lineOrder)
        .map(lyric => ({
          track_id: trackId,
          line_order: lyric.lineOrder,
          start_ms: lyric.startMs,
          end_ms: lyric.endMs ?? null,
          lyric_text: lyric.lyricText.trim(),
        })),
    );

    if (lyricsInsert.error) {
      return { ok: false, error: lyricsInsert.error.message, trackId };
    }
  }

  return { ok: true, trackId };
}

export async function POST(request: NextRequest) {
  const expectedKey = process.env.INGEST_API_KEY;
  const providedKey = request.headers.get('x-ingest-key');

  if (expectedKey && providedKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized ingest key' }, { status: 401 });
  }

  let body: IngestBody;

  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const items = body.items ?? [];

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
  }

  const normalizedItems = items.map(item => normalizeItem(item));
  const validationErrors = normalizedItems.flatMap((item, index) => validateItem(item, index));

  if (validationErrors.length) {
    return NextResponse.json({ error: 'Validation failed', validationErrors }, { status: 400 });
  }

  if (body.dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      count: normalizedItems.length,
      requiredFields: [
        'artist.name',
        'track.title',
        'track.durationSeconds',
        'track.audioStoragePath',
      ],
    });
  }

  const results: Array<{ index: number; ok: boolean; trackId?: string; error?: string }> = [];

  for (const [index, item] of normalizedItems.entries()) {
    const result = await insertTrackGraph(item);
    results.push({ index, ...result });
  }

  const inserted = results.filter(entry => entry.ok).length;
  const failed = results.length - inserted;

  return NextResponse.json({
    ok: failed === 0,
    inserted,
    failed,
    results,
  });
}
