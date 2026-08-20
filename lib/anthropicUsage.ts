// Anthropic's org-wide billing data — a genuinely different credential from
// ANTHROPIC_API_KEY. That key runs chat completions; this one reads
// usage/cost history and requires an Admin API key (sk-ant-admin01-...)
// created in the Console under Settings > Admin API keys, with the
// Usage & Cost read scope. Never the same key as ANTHROPIC_API_KEY.

export function isAnthropicAdminConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_ADMIN_API_KEY);
}

function headers() {
  return {
    'anthropic-version': '2023-06-01',
    'x-api-key': process.env.ANTHROPIC_ADMIN_API_KEY || '',
  };
}

export interface CostSummary {
  totalUsd: number;
  periodDays: number;
  dailyUsd: { date: string; usd: number }[];
}

/** Total spend over the last N days, plus a daily breakdown for a small chart. */
export async function getCostSummary(days = 30): Promise<CostSummary> {
  const endingAt = new Date();
  const startingAt = new Date(endingAt.getTime() - days * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    starting_at: startingAt.toISOString(),
    ending_at: endingAt.toISOString(),
    limit: String(Math.min(days + 1, 31)),
  });

  const res = await fetch(`https://api.anthropic.com/v1/organizations/cost_report?${params.toString()}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Anthropic cost report failed: ${res.status} ${await res.text()}`);
  const data = await res.json();

  const dailyUsd: { date: string; usd: number }[] = [];
  let totalUsd = 0;
  for (const bucket of data.data || []) {
    let dayTotal = 0;
    for (const result of bucket.results || []) {
      dayTotal += Number(result.amount || 0);
    }
    totalUsd += dayTotal;
    dailyUsd.push({ date: (bucket.starting_at || '').slice(0, 10), usd: dayTotal });
  }

  return { totalUsd, periodDays: days, dailyUsd };
}

export interface UsageSummary {
  periodDays: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: { model: string; inputTokens: number; outputTokens: number }[];
}

/** Token usage over the last N days, broken down by model. */
export async function getUsageSummary(days = 7): Promise<UsageSummary> {
  const endingAt = new Date();
  const startingAt = new Date(endingAt.getTime() - days * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    starting_at: startingAt.toISOString(),
    ending_at: endingAt.toISOString(),
    bucket_width: '1d',
    limit: String(Math.min(days + 1, 31)),
  });
  params.append('group_by[]', 'model');

  const res = await fetch(`https://api.anthropic.com/v1/organizations/usage_report/messages?${params.toString()}`, {
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Anthropic usage report failed: ${res.status} ${await res.text()}`);
  const data = await res.json();

  const byModel = new Map<string, { inputTokens: number; outputTokens: number }>();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const bucket of data.data || []) {
    for (const result of bucket.results || []) {
      const model = result.model || 'unknown';
      const input = Number(result.uncached_input_tokens || 0) + Number(result.cache_read_input_tokens || 0) + Number(result.cache_creation_input_tokens || 0);
      const output = Number(result.output_tokens || 0);
      totalInputTokens += input;
      totalOutputTokens += output;
      const existing = byModel.get(model) || { inputTokens: 0, outputTokens: 0 };
      existing.inputTokens += input;
      existing.outputTokens += output;
      byModel.set(model, existing);
    }
  }

  return {
    periodDays: days,
    totalInputTokens,
    totalOutputTokens,
    byModel: [...byModel.entries()].map(([model, v]) => ({ model, ...v })),
  };
}
