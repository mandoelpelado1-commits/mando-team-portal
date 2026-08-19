import type { Metadata } from 'next';

// Next.js REPLACES the parent `openGraph` object rather than deep-merging it,
// so every field has to be restated here — omitting `images` silently drops
// the preview image on this route.
const TITLE = 'Mando El Pelado — Portal del Equipo';
const DESCRIPTION = 'Central de trabajo del equipo · Redes, campañas, presupuesto y metas de carrera';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'Mando El Pelado',
    type: 'website',
    locale: 'es_419',
    url: '/login',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Mando El Pelado — Portal del Equipo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
