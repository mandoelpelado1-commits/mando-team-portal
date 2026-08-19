import { Platform } from './db';

export interface PlatformCredentials {
  clientId: string;
  clientSecret: string;
}

export const ALL_PLATFORMS: Platform[] = ['instagram', 'tiktok', 'facebook', 'youtube', 'x'];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
};

function baseUrl() {
  return process.env.APP_BASE_URL || 'http://localhost:3000';
}

export function redirectUri(platform: Platform) {
  return `${baseUrl()}/api/social/callback/${platform}`;
}

export function buildAuthorizeUrl(platform: Platform, credentials: PlatformCredentials, state: string): string {
  switch (platform) {
    case 'instagram': {
      const params = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri('instagram'),
        response_type: 'code',
        scope: 'instagram_basic,instagram_content_publish,pages_show_list',
        state,
      });
      return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    }
    case 'facebook': {
      const params = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri('facebook'),
        response_type: 'code',
        scope: 'pages_show_list,pages_manage_posts,pages_read_engagement',
        state,
      });
      return `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
    }
    case 'tiktok': {
      const params = new URLSearchParams({
        client_key: credentials.clientId,
        redirect_uri: redirectUri('tiktok'),
        response_type: 'code',
        scope: 'user.info.basic,video.publish,video.upload',
        state,
      });
      return `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;
    }
    case 'youtube': {
      const params = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri('youtube'),
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
        state,
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    case 'x': {
      const params = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri('x'),
        response_type: 'code',
        scope: 'tweet.read tweet.write users.read offline.access',
        state,
        code_challenge: 'challenge',
        code_challenge_method: 'plain',
      });
      return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
    }
  }
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  platformUsername?: string;
}

export async function exchangeCodeForToken(
  platform: Platform,
  credentials: PlatformCredentials,
  code: string
): Promise<TokenExchangeResult> {
  switch (platform) {
    case 'instagram':
    case 'facebook': {
      const params = new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        redirect_uri: redirectUri(platform),
        code,
      });
      const res = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${params.toString()}`);
      if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
      const data = await res.json();
      return { accessToken: data.access_token, expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined };
    }
    case 'tiktok': {
      const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: credentials.clientId,
          client_secret: credentials.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri('tiktok'),
        }),
      });
      if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`);
      const data = await res.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
      };
    }
    case 'youtube': {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri('youtube'),
        }),
      });
      if (!res.ok) throw new Error(`YouTube token exchange failed: ${await res.text()}`);
      const data = await res.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
      };
    }
    case 'x': {
      const res = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri('x'),
          code_verifier: 'challenge',
        }),
      });
      if (!res.ok) throw new Error(`X token exchange failed: ${await res.text()}`);
      const data = await res.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
      };
    }
  }
}
