begin;

drop index if exists public.idx_artists_spotify_artist_id;
drop index if exists public.idx_albums_spotify_album_id;
drop index if exists public.idx_tracks_spotify_track_id;
drop index if exists public.idx_tracks_duration_ms;

alter table public.artists
  drop column if exists spotify_artist_id,
  drop column if exists spotify_url,
  drop column if exists genres;

alter table public.albums
  drop column if exists spotify_album_id,
  drop column if exists spotify_url,
  drop column if exists total_tracks;

alter table public.tracks
  drop column if exists spotify_track_id,
  drop column if exists spotify_uri,
  drop column if exists spotify_url,
  drop column if exists preview_url,
  drop column if exists duration_ms,
  drop column if exists source_provider;

alter table public.tracks
  alter column audio_storage_path set not null;

create index if not exists idx_artists_name on public.artists (name);
create index if not exists idx_artists_genre on public.artists (genre);
create index if not exists idx_artists_popularity on public.artists (popularity desc);
create index if not exists idx_albums_title on public.albums (title);
create index if not exists idx_tracks_title on public.tracks (title);
create index if not exists idx_tracks_popularity_score on public.tracks (popularity_score desc);

commit;