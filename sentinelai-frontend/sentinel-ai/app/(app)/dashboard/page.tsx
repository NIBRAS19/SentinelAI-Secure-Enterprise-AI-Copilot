"use client";

import Link from "next/link";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { Activity, Database, DollarSign, BookOpen, CheckCircle2, Clock, ShieldAlert, Ban, AlertTriangle } from "lucide-react";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { dailyUsage, usageTotals } from "@/lib/mock/usage";
import { knowledgeTotals } from "@/lib/mock/documents";
import { securityEvents } from "@/lib/mock/security-events";
import { auditLogs } from "@/lib/mock/audit-logs";
import { formatCompactNumber, formatCurrency, formatNumber, severityTone } from "@/lib/utils";

// PRD §15.3's own example figures for this specific widget.
const dashboardSecuritySummary = { threatEvents: 7, blockedRequests: 13, policyViolations: 3 };

const severityOrder = ["critical", "high", "medium", "low", "informational"] as const;
const severityCounts = severityOrder.map((sev) => ({
  severity: sev,
  count: securityEvents.filter((e) => e.severity === sev).length,
}));

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title={`Good morning, ${firstName}`}
        description="Here's what's happening across Acme Learning & Consulting today."
        actions={
          <Badge tone="safe" dot>
            Risk level: Low
          </Badge>
        }
      />

      <div className="space-y-8">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-mute">AI usage</h2>
            <Link href="/usage" className="text-xs text-signal hover:underline">
              View usage
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Requests" value={formatNumber(usageTotals.requests)} icon={Activity} />
            <StatCard label="Tokens" value={formatCompactNumber(usageTotals.tokens)} icon={Database} />
            <StatCard label="Estimated cost" value={formatCurrency(usageTotals.cost)} icon={DollarSign} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-mute">Knowledge</h2>
            <Link href="/knowledge" className="text-xs text-signal hover:underline">
              View knowledge base
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Documents" value={formatNumber(knowledgeTotals.documents)} icon={BookOpen} />
            <StatCard label="Indexed" value={formatNumber(knowledgeTotals.indexed)} icon={CheckCircle2} />
            <StatCard label="Processing" value={formatNumber(knowledgeTotals.processing)} icon={Clock} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-mute">Security</h2>
            <Link href="/security" className="text-xs text-signal hover:underline">
              View security dashboard
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Threat events" value={formatNumber(dashboardSecuritySummary.threatEvents)} icon={ShieldAlert} />
            <StatCard label="Blocked requests" value={formatNumber(dashboardSecuritySummary.blockedRequests)} icon={Ban} />
            <StatCard label="Policy violations" value={formatNumber(dashboardSecuritySummary.policyViolations)} icon={AlertTriangle} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>AI requests over time</CardTitle>
              <span className="text-xs text-faint">Last 14 days</span>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyUsage} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reqFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5B8CFF" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#5B8CFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#242C38" vertical={false} />
                  <XAxis dataKey="date" stroke="#57606F" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#57606F" fontSize={11} tickLine={false} axisLine={false} width={36} />
                  <Tooltip
                    contentStyle={{ background: "#131922", border: "1px solid #242C38", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "#ECEEF2" }}
                  />
                  <Area type="monotone" dataKey="requests" stroke="#5B8CFF" fill="url(#reqFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security events by severity</CardTitle>
              <span className="text-xs text-faint">Last 7 days</span>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={severityCounts} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#242C38" vertical={false} />
                  <XAxis dataKey="severity" stroke="#57606F" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#57606F" fontSize={11} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "#131922", border: "1px solid #242C38", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "#ECEEF2" }}
                    cursor={{ fill: "#1A2129" }}
                  />
                  <Bar dataKey="count" fill="#C9962B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <Link href="/audit" className="text-xs text-signal hover:underline">
                Full audit log
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-line">
                {auditLogs.slice(0, 6).map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Badge tone={severityTone(log.severity)}>{log.category}</Badge>
                      <div>
                        <p className="font-mono text-xs text-paper">{log.eventType}</p>
                        <p className="text-xs text-mute">
                          {log.user}
                          {log.resource ? ` — ${log.resource}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-faint">{log.timestamp}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
