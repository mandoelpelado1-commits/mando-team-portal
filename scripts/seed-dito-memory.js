/**
 * Seeds DITO's long-term research on Mando El Pelado (table: dito_memory).
 * This is the baseline researched once via web search; the team can refresh
 * it any time from the DITO page ("Refresh research"), which re-runs the
 * same kind of search live and overwrites this row.
 *
 * Safe to re-run: overwrites the existing row (ON CONFLICT DO UPDATE).
 *
 *   node scripts/seed-dito-memory.js
 */
const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = neon(connectionString);

const CONTENT = `## Background
Mando El Pelado's real name is Armando F. Arteaga. He was born in New York City to Ecuadorian parents. At age 6 he moved with his family to Guayaquil, Ecuador, where he grew up (attended Colegio Espíritu Santo) until age 13, when he returned to the US, where he currently resides. (Sources: mandoelpelado.com/en/biografia, eluniverso.com)

## How his career started
He met Rafael "Fellito" Rodríguez (of EclatNetwork, who had worked with the group Aventura) while both were studying sound engineering at Touro College — this connection kicked off his music career. He debuted in 2012 with his first single "Una noche," and in 2013 began his first international tour alongside Dominican artist Jay Martes (formerly of JN3), with the single "No me digas que no." (Source: mandoelpelado.com/en/biografia)

## Career highlights
- Songs "Hoy se va bebe," "La que Vale," "Tu amiga," and "Traición" were featured on the Ecuavisa telenovela "Si Se Puede."
- Released "Corito Sano" with Guayaquil singer Oveja Negra, and "Olvidar" (2021) with Puerto Rican artist E.Q.
- Performed at Miami's Calle Ocho festival on Univision's stage (2018) and at the "Para Ti Ecuador" festival in New York (2018).
- Has worked with producers J Traxx and SPK.
- Received Best Urban Artist at Telemundo's Premios Viva La Juventud, and got Billboard Argentina coverage for collaborative work. (Source: mandoelpelado.com/en/biografia)
- Featured in Ecuadorian press: extra.ec, eldiario.ec, eluniverso.com, buenosairesnoduerme.com.ar covering releases and his profile as an Ecuadorian-American urban artist building bridges between Ecuador and the US Latino community.

## Recent music (as of this research)
- "Una Bandida" — single feat. Oveja Negra EC & Jordan La Voz Del Barrio, released September 2025, produced by 3erMundo ENT, official video directed by Edgar Andrade. Available on Apple Music, iHeart, Amazon Music, YouTube. (Sources: YouTube, Amazon Music, Facebook/RadioElite997)
- Other recent/known collaborative tracks referenced across platforms: "Noche En Miami," "Codigos," "Summertime" (feat. Sincerity Garcia & Pronto Payne).
- Active discography and profile pages on Apple Music, iHeart, TIDAL, Spotify, and Chartmetric.

## Current focus
Continues promoting recent releases and developing projects connecting Ecuadorian artists across New York, Los Angeles, and Guayaquil — emphasizing global representation of Ecuadorian urban/reggaeton music. Team's current promo focus is Ecuador. (Source: mandoelpelado.com/en/biografia)

## Not verified — do not state as fact
Exact current social media handles (Instagram/TikTok) could not be confirmed via search — there are unrelated accounts with similar names ("El Pelado"). His X/Twitter account is @mandoelpelado (joined January 2013). If asked for exact current handles or follower counts, search live rather than relying on this.`;

(async () => {
  await sql`
    INSERT INTO dito_memory (key, content) VALUES ('mando_profile', ${CONTENT})
    ON CONFLICT (key) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
  `;
  console.log("DITO's memory on Mando El Pelado seeded.");
})().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
