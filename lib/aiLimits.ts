// Mirrors the daily limits enforced in each AI route (lib/rateLimit.ts /
// checkAndIncrementAiUsage call sites) — kept here only for display on the
// usage panel. If a route's limit changes, update it here too.
export const AI_ENDPOINTS: { endpoint: string; label_en: string; label_es: string; limit: number }[] = [
  { endpoint: 'dito-chat', label_en: 'DITO messages', label_es: 'Mensajes a DITO', limit: 40 },
  { endpoint: 'dito-memory-refresh', label_en: "DITO's Mando research refresh", label_es: 'Investigación de DITO sobre Mando', limit: 3 },
  { endpoint: 'generate-posts', label_en: 'AI post generator', label_es: 'Generador de posts IA', limit: 30 },
  { endpoint: 'email-generate', label_en: 'AI email writer', label_es: 'Redactor de emails IA', limit: 20 },
  { endpoint: 'milestone-guide', label_en: 'Milestone step-by-step guides', label_es: 'Guías de metas', limit: 30 },
  { endpoint: 'shows-pitch', label_en: 'Booking pitch generator', label_es: 'Generador de pitch de shows', limit: 30 },
  { endpoint: 'contacts-import', label_en: 'Contact import (AI organize)', label_es: 'Importar contactos (IA)', limit: 10 },
];
