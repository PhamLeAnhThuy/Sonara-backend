# Sonara Backend

Next.js backend for the Sonara app. It uses Postgres on Supabase for songs, artists, albums, playlists, history, and audio delivery.

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
3. `supabase/migrations/004_simple_catalog.sql`

Create a private storage bucket named `track-audio` for uploaded audio files.

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

Core audio fields:

- `tracks.audio_storage_path`
- `track_assets.storage_path`

## Audio Delivery Flow

1. Upload your audio file to the private `track-audio` bucket.
2. Store the bucket path in `tracks.audio_storage_path`.
3. Mobile app calls `GET /api/tracks/:id/play`.
4. Backend returns metadata and, if available, a signed URL.

For better streaming quality later, store HLS variants in `track_assets` and return a signed manifest instead of a single file.

## Batch Insert Shape

Recommended minimum fields for AI-generated import JSON:

- `artist.name`
- `artist.genre` if you want a category tag
- `track.title`
- `track.durationSeconds`
- `track.audioStoragePath`

Optional fields:

- `artist.bio`
- `artist.imageUrl`
- `artist.popularity`
- `album.title`
- `album.coverUrl`
- `album.releaseDate`
- `track.trackNumber`
- `track.artworkUrl`
- `track.audioMimeType`
- `track.explicit`
- `track.popularityScore`
- `assets[]`

Lyrics can be provided as a single text block or as an array of lines. The backend stores a single block per track for now.

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

## Batch Ingest

Use `POST /api/admin/tracks/batch` with a JSON body like this:

```json
{
	"dryRun": true,
	"items": [
		{
			"artist": {
				"name": "Artist Name",
				"genre": "ambient, electronic"
			},
			"album": {
				"title": "Album Name"
			},
			"track": {
				"title": "Song Title",
				"durationSeconds": 248,
				"audioStoragePath": "Song Title.mp3",
				"audioMimeType": "audio/mpeg"
			},
			"lyrics": [
				"Full lyric block line 1\nFull lyric block line 2"
			]
			}
		}
	]
}
```
