/**
 * Printify API — pop-up store sales.
 *
 * Auth: Personal Access Token (Bearer). A User-Agent header is required or
 * requests are rejected. Money values come back as INTEGER CENTS, not dollars.
 * Rate limit is 600 req/min globally, so this fetches in pages and stops early.
 */

const BASE = 'https://api.printify.com/v1';
const UA = 'MandoElPeladoTeamPortal/1.0';

export function isPrintifyConfigured(): boolean {
  return Boolean(process.env.PRINTIFY_API_TOKEN);
}

async function printifyFetch(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
      'User-Agent': UA,
    },
  });
  if (!res.ok) throw new Error(`Printify ${path} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export interface PrintifyShop {
  id: number;
  title: string;
  sales_channel: string;
}

export async function listShops(): Promise<PrintifyShop[]> {
  return (await printifyFetch('/shops.json')) as PrintifyShop[];
}

export interface MerchOrder {
  id: string;
  status: string;
  createdAt: string;
  /** Dollars, converted from the cents the API returns. */
  total: number;
  shipping: number;
  itemCount: number;
  items: { title: string; quantity: number; price: number }[];
}

export interface MerchSummary {
  shopId: number;
  shopTitle: string;
  salesChannel: string;
  currency: 'USD';
  totals: {
    orders: number;
    revenue: number;
    last30Revenue: number;
    last30Orders: number;
    avgOrderValue: number;
  };
  topProducts: { title: string; quantity: number; revenue: number }[];
  recentOrders: MerchOrder[];
  /** Revenue per day for the last 30 days, oldest first. */
  daily: { date: string; revenue: number; orders: number }[];
}

const cents = (v: unknown) => (typeof v === 'number' ? v / 100 : 0);

export async function getMerchSummary(shopIdOverride?: string): Promise<MerchSummary> {
  const shops = await listShops();
  if (!shops.length) throw new Error('No Printify shops found on this account.');

  const shop =
    (shopIdOverride && shops.find((s) => String(s.id) === String(shopIdOverride))) || shops[0];

  // Pull up to 5 pages (500 orders) — plenty for a pop-up shop, and keeps us
  // well inside the rate limit.
  const orders: any[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await printifyFetch(`/shops/${shop.id}/orders.json?limit=100&page=${page}`);
    const batch = res?.data ?? [];
    orders.push(...batch);
    if (batch.length < 100 || page >= (res?.last_page ?? 1)) break;
  }

  const now = Date.now();
  const cutoff30 = now - 30 * 24 * 60 * 60 * 1000;

  const mapped: MerchOrder[] = orders.map((o) => ({
    id: String(o.id),
    status: o.status ?? 'unknown',
    createdAt: o.created_at ?? '',
    total: cents(o.total_price),
    shipping: cents(o.total_shipping),
    itemCount: (o.line_items ?? []).reduce((n: number, li: any) => n + (li.quantity ?? 0), 0),
    items: (o.line_items ?? []).map((li: any) => ({
      title: li.metadata?.title ?? 'Item',
      quantity: li.quantity ?? 0,
      price: cents(li.metadata?.price ?? li.cost),
    })),
  }));

  // Cancelled orders shouldn't count as revenue.
  const counted = mapped.filter((o) => !/cancel|refund/i.test(o.status));

  const revenue = counted.reduce((s, o) => s + o.total, 0);
  const recent30 = counted.filter((o) => o.createdAt && new Date(o.createdAt).getTime() >= cutoff30);

  const productMap = new Map<string, { title: string; quantity: number; revenue: number }>();
  for (const o of counted) {
    for (const item of o.items) {
      const cur = productMap.get(item.title) ?? { title: item.title, quantity: 0, revenue: 0 };
      cur.quantity += item.quantity;
      cur.revenue += item.price * item.quantity;
      productMap.set(item.title, cur);
    }
  }

  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dailyMap.set(d, { revenue: 0, orders: 0 });
  }
  for (const o of recent30) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    const cur = dailyMap.get(key);
    if (cur) {
      cur.revenue += o.total;
      cur.orders += 1;
    }
  }

  return {
    shopId: shop.id,
    shopTitle: shop.title,
    salesChannel: shop.sales_channel,
    currency: 'USD',
    totals: {
      orders: counted.length,
      revenue,
      last30Revenue: recent30.reduce((s, o) => s + o.total, 0),
      last30Orders: recent30.length,
      avgOrderValue: counted.length ? revenue / counted.length : 0,
    },
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6),
    recentOrders: counted
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10),
    daily: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
  };
}
