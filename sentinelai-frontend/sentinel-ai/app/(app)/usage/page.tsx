"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Activity, Database, DollarSign, Gauge, AlertTriangle } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { dailyUsage, modelUsage, usageTotals } from "@/lib/mock/usage";
import { formatCompactNumber, formatCurrency, formatNumber } from "@/lib/utils";

export default function UsagePage() {
  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Usage"
        description="Token consumption, request volume, and estimated cost across every connected model provider."
      />

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Requests" value={formatNumber(usageTotals.requests)} icon={Activity} />
          <StatCard label="Tokens" value={formatCompactNumber(usageTotals.tokens)} icon={Database} />
          <StatCard label="Estimated cost" value={formatCurrency(usageTotals.cost)} icon={DollarSign} />
          <StatCard label="Avg latency" value={`${usageTotals.avgLatencyMs}ms`} icon={Gauge} />
          <StatCard label="Error rate" value={`${usageTotals.errorRate}%`} icon={AlertTriangle} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Token consumption</CardTitle>
            <span className="text-xs text-faint">Last 14 days</span>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={dailyUsage} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="tokenFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9962B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9962B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#242C38" vertical={false} />
                <XAxis dataKey="date" stroke="#57606F" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#57606F"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ background: "#131922", border: "1px solid #242C38", borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: "#ECEEF2" }}
                />
                <Area type="monotone" dataKey="tokens" stroke="#C9962B" fill="url(#tokenFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage by model</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="px-5 py-2.5 text-xs font-medium text-mute">Model</th>
                    <th className="px-5 py-2.5 text-xs font-medium text-mute">Provider</th>
                    <th className="px-5 py-2.5 text-xs font-medium text-mute">Requests</th>
                    <th className="px-5 py-2.5 text-xs font-medium text-mute">Tokens</th>
                    <th className="px-5 py-2.5 text-xs font-medium text-mute">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {modelUsage.map((m) => (
                    <tr key={m.model} className="border-b border-line/60">
                      <td className="px-5 py-3 text-paper">{m.model}</td>
                      <td className="px-5 py-3 text-mute">{m.provider}</td>
                      <td className="px-5 py-3 font-mono text-xs text-mute">{formatNumber(m.requests)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-mute">{formatCompactNumber(m.tokens)}</td>
                      <td className="px-5 py-3 font-mono text-xs text-paper">{formatCurrency(m.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
