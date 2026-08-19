// Digital audio/video platforms where the artist needs a presence.
// Unlike social accounts, most of these have no posting API — the portal
// tracks claim status, links and (where a public API exists) follower counts.

export interface DspSeed {
  slug: string;
  name: string;
  category: 'streaming' | 'video' | 'discovery' | 'dashboard' | 'royalties';
  /** Where to go to claim/manage the profile. */
  manageUrl: string;
  note_en: string;
  note_es: string;
  /** True when the portal can pull live numbers for it. */
  autoMetrics?: boolean;
}

export const DSP_SEED: DspSeed[] = [
  // --- Artist dashboards: where the real data lives ---
  {
    slug: 'spotify-for-artists',
    name: 'Spotify for Artists',
    category: 'dashboard',
    manageUrl: 'https://artists.spotify.com',
    note_en:
      'The most important dashboard. Listener stats by city, playlist pitching, profile control. Claim it via your distributor or by requesting access directly. Spotify has no public API for this dashboard, so open it directly to see full stats.',
    note_es:
      'El dashboard más importante. Estadísticas de oyentes por ciudad, pitching a playlists, control del perfil. Se reclama vía tu distribuidora o pidiendo acceso directo. Spotify no tiene API pública para este dashboard, así que ábrelo directamente para ver todas las estadísticas.',
  },
  {
    slug: 'apple-music-for-artists',
    name: 'Apple Music for Artists',
    category: 'dashboard',
    manageUrl: 'https://artists.apple.com',
    note_en: 'Apple listener data plus Shazam numbers — a useful second read on which cities are reacting.',
    note_es: 'Datos de oyentes de Apple más números de Shazam — segunda lectura útil de qué ciudades reaccionan.',
  },
  {
    slug: 'youtube-studio',
    name: 'YouTube Studio / Official Artist Channel',
    category: 'dashboard',
    manageUrl: 'https://studio.youtube.com',
    note_en:
      'Consolidates your channels into one Official Artist Channel. Enable Content ID through your distributor so you earn when fans use your music.',
    note_es:
      'Consolida tus canales en un Canal Oficial de Artista. Activa Content ID con tu distribuidora para cobrar cuando los fans usen tu música.',
  },

  // --- Streaming platforms ---
  {
    slug: 'spotify',
    name: 'Spotify',
    category: 'streaming',
    manageUrl: 'https://open.spotify.com',
    note_en: 'Primary streaming platform. Followers and popularity update automatically here once the artist ID is set.',
    note_es: 'Plataforma principal. Seguidores y popularidad se actualizan solos aquí una vez configurado el ID de artista.',
    autoMetrics: true,
  },
  {
    slug: 'apple-music',
    name: 'Apple Music',
    category: 'streaming',
    manageUrl: 'https://music.apple.com',
    note_en: 'Strong in the US Latin market. Higher per-stream payout than most platforms.',
    note_es: 'Fuerte en el mercado latino de EE.UU. Paga más por stream que la mayoría.',
  },
  {
    slug: 'youtube-music',
    name: 'YouTube Music',
    category: 'streaming',
    manageUrl: 'https://music.youtube.com',
    note_en: 'Huge in Latin America — often the first place fans search for a song.',
    note_es: 'Enorme en Latinoamérica — suele ser el primer lugar donde los fans buscan una canción.',
  },
  {
    slug: 'amazon-music',
    name: 'Amazon Music',
    category: 'streaming',
    manageUrl: 'https://artists.amazonmusic.com',
    note_en: 'Amazon Music for Artists gives you profile control and Alexa voice-request data.',
    note_es: 'Amazon Music for Artists da control del perfil y datos de peticiones por voz en Alexa.',
  },
  {
    slug: 'deezer',
    name: 'Deezer',
    category: 'streaming',
    manageUrl: 'https://deezer.com',
    note_en: 'Solid presence in Latin America and Europe. Deezer Backstage for profile control.',
    note_es: 'Presencia sólida en Latinoamérica y Europa. Deezer Backstage para control del perfil.',
  },
  {
    slug: 'tidal',
    name: 'TIDAL',
    category: 'streaming',
    manageUrl: 'https://tidal.com',
    note_en: 'Smaller audience but among the highest per-stream payouts.',
    note_es: 'Audiencia menor pero de los pagos por stream más altos.',
  },
  {
    slug: 'soundcloud',
    name: 'SoundCloud',
    category: 'streaming',
    manageUrl: 'https://soundcloud.com',
    note_en: 'Good for early drops, snippets and remixes before official release.',
    note_es: 'Bueno para adelantos, snippets y remixes antes del lanzamiento oficial.',
  },
  {
    slug: 'audiomack',
    name: 'Audiomack',
    category: 'streaming',
    manageUrl: 'https://audiomack.com',
    note_en: 'Strong for urbano and hip-hop. Free uploads and an engaged discovery audience.',
    note_es: 'Fuerte para urbano y hip-hop. Subidas gratis y audiencia activa de descubrimiento.',
  },
  {
    slug: 'pandora',
    name: 'Pandora',
    category: 'streaming',
    manageUrl: 'https://amp.pandora.com',
    note_en: 'US only. Pays through SoundExchange — make sure that registration is done.',
    note_es: 'Solo EE.UU. Paga vía SoundExchange — asegúrate de tener ese registro hecho.',
  },

  // --- Video ---
  {
    slug: 'vevo',
    name: 'Vevo',
    category: 'video',
    manageUrl: 'https://vevo.com',
    note_en:
      'Official music video distribution. You cannot sign up directly — access comes through a distributor or label partner that has a Vevo relationship. Adds credibility and extra monetization on official videos.',
    note_es:
      'Distribución oficial de videos musicales. No te puedes registrar directo — el acceso llega vía una distribuidora o sello con relación con Vevo. Da credibilidad y monetización extra en videos oficiales.',
  },
  {
    slug: 'youtube',
    name: 'YouTube (main channel)',
    category: 'video',
    manageUrl: 'https://youtube.com',
    note_en: 'The main channel for videos, visualizers and behind-the-scenes content.',
    note_es: 'El canal principal para videos, visualizers y contenido detrás de cámaras.',
  },

  // --- Royalty organizations ---
  // None of these offer a public API or OAuth, so the portal stores the
  // account/IPI numbers and links out. Track the member number in the ID field.
  {
    slug: 'pro-bmi-ascap',
    name: 'PRO — BMI or ASCAP',
    category: 'royalties',
    manageUrl: 'https://www.bmi.com',
    note_en:
      'Collects public performance royalties (radio, venues, TV, the performance share of streaming). You affiliate with only ONE as a writer — you cannot split your catalog across two. Store your IPI/CAE number in the ID field.',
    note_es:
      'Cobra regalías de ejecución pública (radio, locales, TV, la parte de ejecución del streaming). Como compositor te afilias a UNA sola — no puedes dividir tu catálogo entre dos. Guarda tu número IPI/CAE en el campo de ID.',
  },
  {
    slug: 'the-mlc',
    name: 'The MLC',
    category: 'royalties',
    manageUrl: 'https://portal.themlc.com',
    note_en:
      'Collects US streaming mechanical royalties. Free. Separate from your PRO — the same stream generates both a mechanical and a performance royalty, collected by different bodies. Unregistered songs sit in an unclaimed pool.',
    note_es:
      'Cobra regalías mecánicas de streaming en EE.UU. Gratis. Distinto de tu PRO — el mismo stream genera regalía mecánica Y de ejecución, cobradas por entidades distintas. Las canciones sin registrar quedan en un fondo no reclamado.',
  },
  {
    slug: 'soundexchange',
    name: 'SoundExchange',
    category: 'royalties',
    manageUrl: 'https://www.soundexchange.com',
    note_en:
      'The only US body collecting digital performance royalties for the SOUND RECORDING (SiriusXM, Pandora radio, internet radio). Free. Applies if Mando owns his masters.',
    note_es:
      'El único organismo en EE.UU. que cobra regalías de ejecución digital de la GRABACIÓN (SiriusXM, Pandora radio, radio por internet). Gratis. Aplica si Mando es dueño de sus másters.',
  },
  {
    slug: 'publishing-admin',
    name: 'Publishing administrator',
    category: 'royalties',
    manageUrl: 'https://www.songtrust.com',
    note_en:
      'Collects royalties from ~100 territories outside the US that The MLC and your PRO do not reach. Takes a percentage — compare options before committing.',
    note_es:
      'Cobra regalías en ~100 territorios fuera de EE.UU. que The MLC y tu PRO no alcanzan. Cobra un porcentaje — compara opciones antes de firmar.',
  },

  // --- Discovery ---
  {
    slug: 'shazam',
    name: 'Shazam',
    category: 'discovery',
    manageUrl: 'https://shazam.com',
    note_en: 'Early signal of organic traction — Shazams spike before streams do when a song catches on.',
    note_es: 'Señal temprana de tracción orgánica — los Shazams suben antes que los streams cuando una canción pega.',
  },
];
