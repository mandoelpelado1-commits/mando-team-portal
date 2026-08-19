import { ImageResponse } from 'next/og';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const alt = 'Mando El Pelado — Team Portal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  // Inline the logo as a data URI — the OG renderer can't fetch relative paths.
  const logo = await fs.readFile(path.join(process.cwd(), 'public', 'mando-el-pelado-logo.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b0b0f',
          position: 'relative',
        }}
      >
        {/* Brand accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 12,
            background: 'linear-gradient(90deg, #ff2e88 0%, #f5c542 50%, #3ee6e6 100%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 32,
            marginBottom: 48,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} width={320} height={208} alt="Mando El Pelado" />
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 30,
            letterSpacing: 14,
            color: '#a1a1aa',
            textTransform: 'uppercase',
          }}
        >
          Team Portal
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 24,
            fontSize: 22,
            color: '#52525b',
          }}
        >
          3ER MUNDO
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 12,
            background: 'linear-gradient(90deg, #3ee6e6 0%, #f5c542 50%, #ff2e88 100%)',
            display: 'flex',
          }}
        />
      </div>
    ),
    size
  );
}
