import type { Metadata, Viewport } from 'next';
import { Anton } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton' });

// Falls back through: explicit config → the URL Vercel assigns → local dev.
// Must never be empty, or `new URL()` throws at build time.
const APP_URL =
  process.env.APP_BASE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: 'Mando El Pelado - Team Portal',
  description: 'Internal team portal for Mando El Pelado career management',
  icons: {
    icon: '/mando-el-pelado-logo.png',
    apple: '/mando-el-pelado-logo.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Mando Portal',
    statusBarStyle: 'black-translucent',
  },
  // Spanish here on purpose — this is the text the team sees in WhatsApp.
  openGraph: {
    title: 'Mando El Pelado — Portal del Equipo',
    description: 'Central de trabajo del equipo · Redes, campañas, presupuesto y metas de carrera',
    siteName: 'Mando El Pelado',
    type: 'website',
    locale: 'es_419',
    url: APP_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mando El Pelado — Portal del Equipo',
    description: 'Central de trabajo del equipo · Redes, campañas, presupuesto y metas de carrera',
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the page paint under the iPhone notch/home indicator; globals.css
  // adds the matching safe-area padding so nothing is actually hidden.
  viewportFit: 'cover',
  themeColor: '#0b0b0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={anton.variable}>
      <body className="min-h-screen bg-ink text-zinc-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
