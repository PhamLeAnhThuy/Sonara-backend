alter table public.artists
  add column if not exists is_featured boolean not null default false;

alter table public.tracks
  add column if not exists is_recommended boolean not null default false,
  add column if not exists is_trending boolean not null default false,
  add column if not exists popularity_score integer not null default 0;

create index if not exists idx_tracks_is_recommended on public.tracks (is_recommended, popularity_score desc);
create index if not exists idx_tracks_is_trending on public.tracks (is_trending, popularity_score desc);
create index if not exists idx_artists_is_featured on public.artists (is_featured);
