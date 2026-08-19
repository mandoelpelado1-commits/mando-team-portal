/**
 * Spotify Web API — public artist data only.
 *
 * Deliberately uses the client-credentials flow: followers, popularity and
 * top tracks are public, so no per-user OAuth is needed. Note this is NOT
 * Spotify for Artists — that dashboard has no public API, so the portal
 * links out to it rather than pretending to pull its numbers.
 */

export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) return cachedToken.token;

  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });

  if (!res.ok) throw new Error(`Spotify auth failed: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  followers: number;
  popularity: number;
  genres: string[];
  url: string;
  imageUrl: string | null;
}

/** Accepts a bare artist ID, a spotify: URI, or an open.spotify.com URL. */
export function parseArtistId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed;
  const uri = trimmed.match(/^spotify:artist:([A-Za-z0-9]{22})$/);
  if (uri) return uri[1];
  const url = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?artist\/([A-Za-z0-9]{22})/);
  if (url) return url[1];
  return null;
}

export async function getArtist(artistId: string): Promise<SpotifyArtist> {
  const token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify artist lookup failed: ${await res.text()}`);
  const a = await res.json();
  return {
    id: a.id,
    name: a.name,
    followers: a.followers?.total ?? 0,
    popularity: a.popularity ?? 0,
    genres: a.genres ?? [],
    url: a.external_urls?.spotify ?? `https://open.spotify.com/artist/${a.id}`,
    imageUrl: a.images?.[0]?.url ?? null,
  };
}

export async function searchArtists(query: string, limit = 5): Promise<SpotifyArtist[]> {
  const token = await getAccessToken();
  const params = new URLSearchParams({ q: query, type: 'artist', limit: String(limit) });
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify search failed: ${await res.text()}`);
  const data = await res.json();
  return (data.artists?.items ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    followers: a.followers?.total ?? 0,
    popularity: a.popularity ?? 0,
    genres: a.genres ?? [],
    url: a.external_urls?.spotify ?? `https://open.spotify.com/artist/${a.id}`,
    imageUrl: a.images?.[0]?.url ?? null,
  }));
}
