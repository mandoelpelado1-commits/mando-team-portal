import Anthropic from '@anthropic-ai/sdk';
import { Contact, ContactType } from './db';

export interface ParsedContact {
  name: string;
  type: ContactType;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
}

const VALID_TYPES: ContactType[] = ['venue', 'promoter', 'press', 'sync', 'curator', 'other'];

const INSTRUCTIONS = `You are organizing a raw contact list into structured booking/press contacts for reggaeton/urbano artist Mando El Pelado's team (venues, promoters, press, sync licensing, playlist curators).

For each contact you find, extract:
- name (required — person or venue/organization name)
- type: one of venue, promoter, press, sync, curator, other — infer from context (a club/theater/hall is "venue"; a talent buyer/booking agent is "promoter"; a journalist/blog/radio/outlet is "press"; a music supervisor/sync licensing contact is "sync"; a playlist curator is "curator"; anything else is "other")
- company (organization/venue/label name if distinct from the contact name, else null)
- email (null if none)
- phone (null if none)
- city (null if unknown)
- country (null if unknown)
- notes (any other relevant detail worth keeping — role/title, genre focus, etc. — else null)

Skip rows that are clearly headers, blank, or not actually a contact. Do not invent information that isn't present or reasonably inferable from context (e.g. don't guess an email address).

Respond with ONLY a valid JSON array, no markdown fences, no commentary:
[{"name": "...", "type": "...", "company": null, "email": null, "phone": null, "city": null, "country": null, "notes": null}]`;

function sanitize(raw: any[]): ParsedContact[] {
  const out: ParsedContact[] = [];
  for (const r of raw) {
    if (!r || typeof r.name !== 'string' || !r.name.trim()) continue;
    out.push({
      name: r.name.trim().slice(0, 200),
      type: VALID_TYPES.includes(r.type) ? r.type : 'other',
      company: typeof r.company === 'string' && r.company.trim() ? r.company.trim().slice(0, 200) : null,
      email: typeof r.email === 'string' && r.email.trim() ? r.email.trim().slice(0, 200) : null,
      phone: typeof r.phone === 'string' && r.phone.trim() ? r.phone.trim().slice(0, 60) : null,
      city: typeof r.city === 'string' && r.city.trim() ? r.city.trim().slice(0, 120) : null,
      country: typeof r.country === 'string' && r.country.trim() ? r.country.trim().slice(0, 120) : null,
      notes: typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim().slice(0, 500) : null,
    });
  }
  return out;
}

function parseJsonArray(text: string): any[] {
  // Claude sometimes wraps JSON in prose despite instructions; pull out the array.
  const match = text.match(/\[[\s\S]*\]/);
  const parsed = JSON.parse(match ? match[0] : text);
  if (!Array.isArray(parsed)) throw new Error('AI did not return a JSON array.');
  return parsed;
}

// Cap how much raw text we feed in one call — this is a contact list, not a
// novel, and keeps the request well inside the model's practical limits.
const MAX_TEXT_CHARS = 120_000;

export async function organizeContactsFromText(text: string): Promise<ParsedContact[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set.');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: `${INSTRUCTIONS}\n\nRAW CONTACT DATA:\n${text.slice(0, MAX_TEXT_CHARS)}`,
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('AI did not return any text.');
  return sanitize(parseJsonArray(textBlock.text));
}

export async function organizeContactsFromPdf(base64: string): Promise<ParsedContact[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set.');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
          { type: 'text', text: INSTRUCTIONS },
        ],
      },
    ],
  });
  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('AI did not return any text.');
  return sanitize(parseJsonArray(textBlock.text));
}

/** True if a candidate looks like an existing contact — same email, or same name + company. */
export function isDuplicateContact(existing: Contact[], candidate: ParsedContact): boolean {
  const email = candidate.email?.toLowerCase().trim();
  const name = candidate.name.toLowerCase().trim();
  const company = candidate.company?.toLowerCase().trim() || '';
  return existing.some((c) => {
    if (email && c.email && c.email.toLowerCase().trim() === email) return true;
    return c.name.toLowerCase().trim() === name && (c.company?.toLowerCase().trim() || '') === company;
  });
}
