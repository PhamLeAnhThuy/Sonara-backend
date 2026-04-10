begin;

alter table public.artists
  add column if not exists spotify_artist_id text,
  add column if not exists spotify_url text,
  add column if not exists genres text[] not null default '{}',
  add column if not exists popularity integer not null default 0;

alter table public.albums
  add column if not exists spotify_album_id text,
  add column if not exists spotify_url text,
  add column if not exists total_tracks integer;

alter table public.tracks
  add column if not exists spotify_track_id text,
  add column if not exists spotify_uri text,
  add column if not exists spotify_url text,
  add column if not exists preview_url text,
  add column if not exists duration_ms integer,
  add column if not exists explicit boolean not null default false,
  add column if not exists popularity integer not null default 0,
  add column if not exists source_provider text not null default 'spotify';

alter table public.tracks
  alter column audio_storage_path drop not null;

create unique index if not exists idx_artists_spotify_artist_id on public.artists (spotify_artist_id) where spotify_artist_id is not null;
create unique index if not exists idx_albums_spotify_album_id on public.albums (spotify_album_id) where spotify_album_id is not null;
create unique index if not exists idx_tracks_spotify_track_id on public.tracks (spotify_track_id) where spotify_track_id is not null;

create index if not exists idx_artists_genres_gin on public.artists using gin (genres);
create index if not exists idx_tracks_popularity on public.tracks (popularity desc);
create index if not exists idx_tracks_duration_ms on public.tracks (duration_ms);

commit;
