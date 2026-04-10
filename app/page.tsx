'use client';

import React from 'react';

type BatchResponse = {
  ok: boolean;
  dryRun?: boolean;
  inserted?: number;
  failed?: number;
  results?: Array<{ index: number; ok: boolean; trackId?: string; error?: string }>;
  error?: string;
  validationErrors?: string[];
};

const defaultSingleItem = {
  artist: {
    name: '',
    bio: '',
    genre: '',
    imageUrl: '',
    popularity: 0,
  },
  album: {
    title: '',
    coverUrl: '',
    releaseDate: '',
  },
  track: {
    title: '',
    durationSeconds: 0,
    trackNumber: 1,
    artworkUrl: '',
    audioStoragePath: '',
    audioMimeType: 'audio/mpeg',
    explicit: false,
    popularityScore: 0,
  },
  assets: [],
  lyrics: '' as string,
};

const formatExample = `[
  {
    "artist": {
      "name": "The Blueprint Collective",
      "genre": "ambient, neo-classical",
      "imageUrl": "https://.../artist.jpg"
    },
    "album": {
      "title": "Late Geometry",
      "coverUrl": "https://.../cover.jpg",
      "releaseDate": "2026-04-10"
    },
    "track": {
      "title": "Concrete Sky",
      "durationSeconds": 248,
      "trackNumber": 1,
      "artworkUrl": "https://.../art.jpg",
      "audioStoragePath": "tracks/concrete-sky.mp3",
      "audioMimeType": "audio/mpeg",
      "explicit": false
    },
    "lyrics": [
      "Sky over concrete.\nWe redraw the city."
    ]
  }
]`;

const fieldGuide = [
  { field: 'artist.name', required: 'Yes', format: 'string', notes: 'Artist display name' },
  { field: 'artist.bio', required: 'No', format: 'string', notes: 'Short biography text' },
  { field: 'artist.genre', required: 'No', format: 'string', notes: 'Genre or genre list as plain text' },
  { field: 'artist.imageUrl', required: 'No', format: 'URL string', notes: 'Public image URL' },
  { field: 'artist.popularity', required: 'No', format: 'integer', notes: 'Artist ranking score' },
  { field: 'album.title', required: 'Yes if known', format: 'string', notes: 'Album title' },
  { field: 'album.coverUrl', required: 'No', format: 'URL string', notes: 'Album artwork URL' },
  { field: 'album.releaseDate', required: 'No', format: 'YYYY-MM-DD', notes: 'Postgres date format' },
  { field: 'track.title', required: 'Yes', format: 'string', notes: 'Track title' },
  { field: 'track.durationSeconds', required: 'Yes', format: 'integer > 0', notes: 'Song duration in seconds' },
  { field: 'track.trackNumber', required: 'No', format: 'integer', notes: 'Position in album' },
  { field: 'track.artworkUrl', required: 'No', format: 'URL string', notes: 'Track artwork URL' },
  { field: 'track.audioStoragePath', required: 'Yes', format: 'string path', notes: 'Path inside the track-audio bucket' },
  { field: 'track.audioMimeType', required: 'No', format: 'string', notes: 'Example: audio/mpeg' },
  { field: 'track.explicit', required: 'No', format: 'boolean', notes: 'Explicit content flag' },
  { field: 'track.popularityScore', required: 'No', format: 'integer', notes: 'Higher = stronger ranking' },
  { field: 'lyrics', required: 'No', format: 'string or array', notes: 'Plain text block or line array; backend stores one block' },
];

export default function HomePage() {
  const [singleItem, setSingleItem] = React.useState(defaultSingleItem);
  const [batchJson, setBatchJson] = React.useState(formatExample);
  const [ingestKey, setIngestKey] = React.useState('');
  const [dryRun, setDryRun] = React.useState(false);
  const [result, setResult] = React.useState<BatchResponse | null>(null);
  const [loading, setLoading] = React.useState(false);

  const requestInsert = async (items: unknown[], dryRunOverride?: boolean) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/tracks/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ingestKey.trim() ? { 'x-ingest-key': ingestKey.trim() } : {}),
        },
        body: JSON.stringify({ items, dryRun: dryRunOverride ?? dryRun }),
      });

      const data = (await response.json()) as BatchResponse;
      setResult(data);
    } catch {
      setResult({ ok: false, error: 'Request failed. Check backend server logs.' });
    } finally {
      setLoading(false);
    }
  };

  const submitSingle = async () => {
    const payload = {
      ...singleItem,
      album: singleItem.album.title.trim() ? singleItem.album : undefined,
      lyrics: singleItem.lyrics.trim() ? singleItem.lyrics : undefined,
    };
    await requestInsert([payload]);
  };

  const submitBatch = async () => {
    try {
      const parsed = JSON.parse(batchJson);

      if (Array.isArray(parsed)) {
        await requestInsert(parsed);
        return;
      }

      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown[] }).items)) {
        const payload = parsed as { items: unknown[]; dryRun?: boolean };
        await requestInsert(payload.items, payload.dryRun);
        return;
      }

      setResult({ ok: false, error: 'Batch JSON must be either an array or an object with an items array.' });
    } catch {
      setResult({ ok: false, error: 'Batch JSON is invalid.' });
    }
  };

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', margin: '0 auto', maxWidth: 1120, padding: 24, color: '#1f2937' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Sonara Song Ingest Console</h1>
      <p style={{ marginTop: 0, marginBottom: 18, color: '#4b5563' }}>
        Insert songs into Supabase (single or batch). Use Dry Run only when you want validation without saving.
      </p>

      <section style={cardStyle}>
        <h2 style={sectionTitle}>Auth and Mode</h2>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 180px' }}>
          <input
            value={ingestKey}
            onChange={event => setIngestKey(event.target.value)}
            placeholder="INGEST_API_KEY (optional if backend does not require key)"
            style={inputStyle}
            type="password"
          />
          <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            <input checked={dryRun} onChange={event => setDryRun(event.target.checked)} type="checkbox" />
            Dry Run only
          </label>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitle}>Single Insert</h2>
        <div style={grid2}>
          <input
            value={singleItem.artist.name}
            onChange={event => setSingleItem(prev => ({ ...prev, artist: { ...prev.artist, name: event.target.value } }))}
            placeholder="artist.name (required)"
            style={inputStyle}
          />
          <input
            value={singleItem.artist.genre}
            onChange={event => setSingleItem(prev => ({ ...prev, artist: { ...prev.artist, genre: event.target.value } }))}
            placeholder="artist.genre"
            style={inputStyle}
          />
          <input
            value={singleItem.artist.imageUrl}
            onChange={event => setSingleItem(prev => ({ ...prev, artist: { ...prev.artist, imageUrl: event.target.value } }))}
            placeholder="artist.imageUrl (optional)"
            style={inputStyle}
          />
          <input
            value={singleItem.artist.popularity || ''}
            onChange={event => setSingleItem(prev => ({ ...prev, artist: { ...prev.artist, popularity: Number(event.target.value) || 0 } }))}
            placeholder="artist.popularity (optional)"
            style={inputStyle}
            type="number"
          />
          <input
            value={singleItem.track.title}
            onChange={event => setSingleItem(prev => ({ ...prev, track: { ...prev.track, title: event.target.value } }))}
            placeholder="track.title (required)"
            style={inputStyle}
          />
          <input
            value={singleItem.track.durationSeconds || ''}
            onChange={event => setSingleItem(prev => ({ ...prev, track: { ...prev.track, durationSeconds: Number(event.target.value) || 0 } }))}
            placeholder="track.durationSeconds (required)"
            style={inputStyle}
            type="number"
          />
          <input
            value={singleItem.track.audioStoragePath}
            onChange={event => setSingleItem(prev => ({ ...prev, track: { ...prev.track, audioStoragePath: event.target.value } }))}
            placeholder="track.audioStoragePath (required)"
            style={inputStyle}
          />
          <input
            value={singleItem.track.audioMimeType}
            onChange={event => setSingleItem(prev => ({ ...prev, track: { ...prev.track, audioMimeType: event.target.value } }))}
            placeholder="track.audioMimeType (optional)"
            style={inputStyle}
          />
          <input
            value={singleItem.album.title}
            onChange={event => setSingleItem(prev => ({ ...prev, album: { ...prev.album, title: event.target.value } }))}
            placeholder="album.title (optional but useful)"
            style={inputStyle}
          />
          <input
            value={singleItem.album.coverUrl}
            onChange={event => setSingleItem(prev => ({ ...prev, album: { ...prev.album, coverUrl: event.target.value } }))}
            placeholder="album.coverUrl (optional)"
            style={inputStyle}
          />
          <input
            value={singleItem.album.releaseDate}
            onChange={event => setSingleItem(prev => ({ ...prev, album: { ...prev.album, releaseDate: event.target.value } }))}
            placeholder="album.releaseDate (optional)"
            style={inputStyle}
          />
          <input
            value={singleItem.track.artworkUrl}
            onChange={event => setSingleItem(prev => ({ ...prev, track: { ...prev.track, artworkUrl: event.target.value } }))}
            placeholder="track.artworkUrl (optional)"
            style={inputStyle}
          />
          <input
            value={singleItem.track.trackNumber || ''}
            onChange={event => setSingleItem(prev => ({ ...prev, track: { ...prev.track, trackNumber: Number(event.target.value) || 0 } }))}
            placeholder="track.trackNumber (optional)"
            style={inputStyle}
            type="number"
          />
          <input
            value={singleItem.track.popularityScore || ''}
            onChange={event => setSingleItem(prev => ({ ...prev, track: { ...prev.track, popularityScore: Number(event.target.value) || 0 } }))}
            placeholder="track.popularityScore (optional)"
            style={inputStyle}
            type="number"
          />
          <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            <input
              checked={singleItem.track.explicit}
              onChange={event => setSingleItem(prev => ({ ...prev, track: { ...prev.track, explicit: event.target.checked } }))}
              type="checkbox"
            />
            track.explicit
          </label>
          <textarea
            value={singleItem.lyrics}
            onChange={event => setSingleItem(prev => ({ ...prev, lyrics: event.target.value }))}
            placeholder="lyrics block (optional)"
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical', gridColumn: '1 / -1' }}
          />
        </div>
        <button disabled={loading} onClick={submitSingle} style={buttonStyle}>
          {loading ? 'Submitting...' : 'Insert Single Item'}
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitle}>Batch Insert (JSON Array)</h2>
        <textarea
          value={batchJson}
          onChange={event => setBatchJson(event.target.value)}
          style={{ ...inputStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', minHeight: 320, resize: 'vertical' }}
        />
        <button disabled={loading} onClick={submitBatch} style={buttonStyle}>
          {loading ? 'Submitting...' : 'Insert Batch'}
        </button>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitle}>Required Info and Format</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 980, width: '100%' }}>
            <thead>
              <tr>
                <th style={thStyle}>Field</th>
                <th style={thStyle}>Required</th>
                <th style={thStyle}>Format</th>
                <th style={thStyle}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {fieldGuide.map(row => (
                <tr key={row.field}>
                  <td style={tdStyle}><code>{row.field}</code></td>
                  <td style={tdStyle}>{row.required}</td>
                  <td style={tdStyle}>{row.format}</td>
                  <td style={tdStyle}>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {result ? (
        <section style={{ ...cardStyle, borderColor: result.ok ? '#86efac' : '#fca5a5' }}>
          <h2 style={sectionTitle}>Result</h2>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </section>
      ) : null}

      <section style={cardStyle}>
        <h2 style={sectionTitle}>What to Give AI</h2>
        <ul style={{ marginTop: 0, paddingLeft: 20, lineHeight: 1.7 }}>
          <li>A raw list of songs, albums, or playlists you want imported</li>
          <li>Artist name and optional genre, bio, image URL, popularity</li>
          <li>Album title and optional cover URL, release date</li>
          <li>Track title, duration in seconds, artwork URL, and track number</li>
          <li>The file path inside the track-audio bucket, such as Song Title.mp3</li>
          <li>Lyrics as one plain text block if you want lyric display in the app</li>
        </ul>
        <p style={{ marginBottom: 0 }}>
          You do not need Spotify references. The backend stores your own catalog data.
        </p>
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  marginBottom: 16,
  padding: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  marginBottom: 12,
  marginTop: 0,
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  padding: '10px 12px',
  width: '100%',
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: '#111827',
  border: 'none',
  borderRadius: 8,
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: 14,
  marginTop: 12,
  padding: '10px 14px',
};

const grid2: React.CSSProperties = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
};

const thStyle: React.CSSProperties = {
  borderBottom: '1px solid #d1d5db',
  fontSize: 13,
  fontWeight: 700,
  padding: '10px 12px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid #e5e7eb',
  fontSize: 13,
  padding: '10px 12px',
  verticalAlign: 'top',
};
