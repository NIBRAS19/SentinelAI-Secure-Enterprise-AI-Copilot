import type { ModelUsage, UsagePoint } from "@/lib/types";

// 14-day trailing window. Totals below intentionally match the headline
// figures on the Dashboard (PRD §15.3: 1,284 requests · 3.2M tokens ·
// $42.18) so the two pages read as the same underlying data.
export const dailyUsage: UsagePoint[] = [
  { date: "Sep 13", requests: 72, tokens: 179000, cost: 2.36 },
  { date: "Sep 14", requests: 78, tokens: 194000, cost: 2.56 },
  { date: "Sep 15", requests: 81, tokens: 202000, cost: 2.66 },
  { date: "Sep 16", requests: 85, tokens: 212000, cost: 2.79 },
  { date: "Sep 17", requests: 79, tokens: 197000, cost: 2.6 },
  { date: "Sep 18", requests: 88, tokens: 219000, cost: 2.89 },
  { date: "Sep 19", requests: 93, tokens: 232000, cost: 3.06 },
  { date: "Sep 20", requests: 90, tokens: 224000, cost: 2.95 },
  { date: "Sep 21", requests: 97, tokens: 242000, cost: 3.19 },
  { date: "Sep 22", requests: 95, tokens: 237000, cost: 3.12 },
  { date: "Sep 23", requests: 101, tokens: 252000, cost: 3.32 },
  { date: "Sep 24", requests: 99, tokens: 247000, cost: 3.25 },
  { date: "Sep 25", requests: 108, tokens: 269000, cost: 3.55 },
  { date: "Sep 26", requests: 118, tokens: 294000, cost: 3.88 },
];

export const modelUsage: ModelUsage[] = [
  { model: "Claude Sonnet 5", provider: "Anthropic", requests: 812, tokens: 2100000, cost: 28.4 },
  { model: "GPT-4o", provider: "OpenAI", requests: 340, tokens: 700000, cost: 9.1 },
  { model: "Llama 3.1 70B", provider: "Ollama (self-hosted)", requests: 132, tokens: 400000, cost: 4.68 },
];

export const usageTotals = {
  requests: 1284,
  tokens: 3200000,
  cost: 42.18,
  avgLatencyMs: 640,
  errorRate: 0.4,
};
