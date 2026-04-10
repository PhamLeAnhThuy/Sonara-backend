create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bio text not null default '',
  genre text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null,
  cover_url text not null default '',
  release_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  album_id uuid references public.albums (id) on delete set null,
  title text not null,
  duration_seconds integer not null check (duration_seconds > 0),
  track_number integer,
  artwork_url text not null default '',
  audio_storage_path text not null,
  audio_mime_type text not null default 'audio/mpeg',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_assets (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  quality_label text not null,
  storage_path text not null,
  bitrate integer,
  mime_type text not null default 'audio/mpeg',
  duration_seconds integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.track_lyrics (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks (id) on delete cascade,
  line_order integer not null,
  start_ms integer not null default 0,
  end_ms integer,
  lyric_text text not null,
  created_at timestamptz not null default now(),
  unique (track_id, line_order)
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_tracks (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users (id) on delete set null,
  primary key (playlist_id, track_id)
);

create table if not exists public.user_library (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

create table if not exists public.follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, artist_id)
);

create table if not exists public.play_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id uuid not null references public.tracks (id) on delete cascade,
  played_at timestamptz not null default now(),
  progress_seconds integer not null default 0,
  device_id text
);

create index if not exists idx_tracks_artist_id on public.tracks (artist_id);
create index if not exists idx_tracks_album_id on public.tracks (album_id);
create index if not exists idx_playlist_tracks_playlist_id_position on public.playlist_tracks (playlist_id, position);
create index if not exists idx_track_lyrics_track_id_order on public.track_lyrics (track_id, line_order);
create index if not exists idx_playlists_user_id on public.playlists (user_id);

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;
alter table public.track_assets enable row level security;
alter table public.track_lyrics enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.user_library enable row level security;
alter table public.follows enable row level security;
alter table public.play_history enable row level security;

create policy "profiles_self_select" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_self_insert" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "artists_public_select" on public.artists
  for select to anon, authenticated
  using (true);

create policy "albums_public_select" on public.albums
  for select to anon, authenticated
  using (true);

create policy "tracks_public_select" on public.tracks
  for select to anon, authenticated
  using (is_public = true or auth.role() = 'service_role');

create policy "track_assets_public_select" on public.track_assets
  for select to anon, authenticated
  using (auth.role() = 'service_role' or exists (
    select 1 from public.tracks t where t.id = track_id and t.is_public = true
  ));

create policy "track_lyrics_public_select" on public.track_lyrics
  for select to anon, authenticated
  using (exists (
    select 1 from public.tracks t where t.id = track_id and t.is_public = true
  ));

create policy "playlists_owner_select" on public.playlists
  for select to authenticated
  using (user_id = auth.uid());

create policy "playlists_owner_insert" on public.playlists
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "playlists_owner_update" on public.playlists
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "playlists_owner_delete" on public.playlists
  for delete to authenticated
  using (user_id = auth.uid());

create policy "playlist_tracks_owner_select" on public.playlist_tracks
  for select to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()));

create policy "playlist_tracks_owner_insert" on public.playlist_tracks
  for insert to authenticated
  with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()));

create policy "playlist_tracks_owner_delete" on public.playlist_tracks
  for delete to authenticated
  using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = auth.uid()));

create policy "user_library_owner_select" on public.user_library
  for select to authenticated
  using (user_id = auth.uid());

create policy "user_library_owner_insert" on public.user_library
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "user_library_owner_delete" on public.user_library
  for delete to authenticated
  using (user_id = auth.uid());

create policy "follows_owner_select" on public.follows
  for select to authenticated
  using (user_id = auth.uid());

create policy "follows_owner_insert" on public.follows
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "follows_owner_delete" on public.follows
  for delete to authenticated
  using (user_id = auth.uid());

create policy "play_history_owner_select" on public.play_history
  for select to authenticated
  using (user_id = auth.uid());

create policy "play_history_owner_insert" on public.play_history
  for insert to authenticated
  with check (user_id = auth.uid());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger touch_artists_updated_at before update on public.artists
  for each row execute function public.touch_updated_at();

create trigger touch_albums_updated_at before update on public.albums
  for each row execute function public.touch_updated_at();

create trigger touch_tracks_updated_at before update on public.tracks
  for each row execute function public.touch_updated_at();

create trigger touch_playlists_updated_at before update on public.playlists
  for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public)
values ('track-audio', 'track-audio', false)
on conflict (id) do nothing;
