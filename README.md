# Sonara Backend

Next.js backend for the Sonara app. It uses Postgres on Supabase for metadata and Supabase Storage for private audio delivery.

## Environment

Copy `.env.example` to `.env.local` and fill in the Supabase values.

Required variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase Setup

Run the SQL migrations in order:

1. `supabase/migrations/001_init.sql`
2. `supabase/migrations/002_feed_flags.sql`

Create a private storage bucket named `track-audio` if you want to manage it manually. The migration already tries to create it.

## Data Model

The schema includes:

- `profiles`
- `artists`
- `albums`
- `tracks`
- `track_assets`
- `track_lyrics`
- `playlists`
- `playlist_tracks`
- `user_library`
- `follows`
- `play_history`

Recommended and trending tracks use `tracks.is_recommended`, `tracks.is_trending`, and `tracks.popularity_score`.
Featured artists use `artists.is_featured`.

## Audio Delivery Flow

1. Upload audio to the private `track-audio` bucket.
2. Store the path in `tracks.audio_storage_path`.
3. Mobile app calls `GET /api/tracks/:id/play`.
4. Backend validates the request and returns a short-lived signed URL.

For better streaming quality later, store HLS variants in `track_assets` and return a signed manifest instead of a single file.

## Auth Flow

- `POST /api/auth/register` creates a Supabase Auth user and profile row.
- `POST /api/auth/login` returns access and refresh tokens for the mobile app.
- `POST /api/auth/logout` is a client sign-out acknowledgement; the client should clear tokens.
- `GET /api/me` returns the current profile and collection counts.

## Main API Endpoints

- `GET /api/health`
- `GET /api/home-feed`
- `GET /api/search?q=...`
- `GET /api/tracks/:id`
- `GET /api/tracks/:id/play`
- `GET /api/artists/:id`
- `GET /api/playlists`
- `POST /api/playlists`
- `GET /api/playlists/:id`
- `PATCH /api/playlists/:id`
- `DELETE /api/playlists/:id`
- `POST /api/playlists/:id/tracks`
- `DELETE /api/playlists/:id/tracks/:trackId`
- `POST /api/library/like`
- `DELETE /api/library/like`

## Mobile Client Contract

Send the access token in the `Authorization: Bearer <token>` header for authenticated calls.

The app should treat the backend as the source of truth for:

- login/logout
- feed sections
- search results
- playlist CRUD
- track metadata
- signed audio URLs
