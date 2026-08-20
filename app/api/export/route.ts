import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllMilestones,
  getAllContacts,
  getAllShows,
  getAllPlaylists,
  getBudgetChangeRequests,
  getAllIdeas,
} from '@/lib/db';

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

const DATASETS: Record<string, () => Promise<Record<string, unknown>[]>> = {
  milestones: async () =>
    (await getAllMilestones()).map((m) => ({
      title: m.title_en,
      category: m.category,
      priority: m.priority,
      status: m.status,
      notes: m.notes,
      updated_at: m.updated_at,
    })),
  contacts: async () =>
    (await getAllContacts()).map((c) => ({
      name: c.name,
      type: c.type,
      company: c.company,
      email: c.email,
      phone: c.phone,
      city: c.city,
      country: c.country,
      status: c.status,
      updated_at: c.updated_at,
    })),
  shows: async () =>
    (await getAllShows()).map((s) => ({
      venue: s.venue_name,
      city: s.city,
      country: s.country,
      target_date: s.target_date,
      capacity: s.capacity,
      fee_offered: s.fee_offered,
      status: s.status,
    })),
  playlists: async () =>
    (await getAllPlaylists()).map((p) => ({
      name: p.name,
      platform: p.platform,
      curator: p.curator,
      song: p.song_title,
      followers: p.followers,
      status: p.status,
      date_added: p.date_added,
    })),
  budget_history: async () =>
    (await getBudgetChangeRequests()).map((r) => ({
      campaign: r.campaign_name,
      current_budget: (r.current_budget_micros / 1_000_000).toFixed(2),
      proposed_budget: (r.proposed_budget_micros / 1_000_000).toFixed(2),
      status: r.status,
      created_at: r.created_at,
      resolved_at: r.resolved_at,
    })),
  ideas: async () =>
    (await getAllIdeas()).map((i) => ({
      content: i.content,
      created_at: i.created_at,
    })),
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dataset = new URL(req.url).searchParams.get('dataset') || '';
  const loader = DATASETS[dataset];
  if (!loader) {
    return NextResponse.json({ error: `Unknown dataset. Valid: ${Object.keys(DATASETS).join(', ')}` }, { status: 400 });
  }

  const rows = await loader();
  const csv = toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${dataset}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
