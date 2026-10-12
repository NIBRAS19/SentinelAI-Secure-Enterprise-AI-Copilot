"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form-elements";
import { Badge } from "@/components/ui/badge";
import { auditLogs } from "@/lib/mock/audit-logs";
import { severityTone } from "@/lib/utils";

const categories = ["All", "AUTH", "USER", "DOCUMENT", "KNOWLEDGE", "AI", "AGENT", "TOOL", "SECURITY", "POLICY", "ADMIN", "SYSTEM"];
const severities = ["All", "critical", "high", "medium", "low", "informational"];

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [severity, setSeverity] = useState("All");

  const filtered = useMemo(() => {
    return auditLogs.filter((log) => {
      if (category !== "All" && log.category !== category) return false;
      if (severity !== "All" && log.severity !== severity) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${log.eventType} ${log.user} ${log.resource ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [search, category, severity]);

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Audit log" description="An append-oriented record of authentication, AI, agent, tool and policy events." />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by event, user or resource..."
          className="max-w-xs"
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All categories" : c}
            </option>
          ))}
        </Select>
        <Select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-auto">
          {severities.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All severities" : s}
            </option>
          ))}
        </Select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-5 py-2.5 text-xs font-medium text-mute">Timestamp</th>
                <th className="px-5 py-2.5 text-xs font-medium text-mute">Event</th>
                <th className="px-5 py-2.5 text-xs font-medium text-mute">User</th>
                <th className="px-5 py-2.5 text-xs font-medium text-mute">Resource</th>
                <th className="px-5 py-2.5 text-xs font-medium text-mute">Severity</th>
                <th className="px-5 py-2.5 text-xs font-medium text-mute">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-line/60">
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-faint">{log.timestamp}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-paper">{log.eventType}</span>
                      <Badge tone="neutral">{log.category}</Badge>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-mute">{log.user}</td>
                  <td className="max-w-xs truncate px-5 py-3 text-mute">{log.resource ?? "—"}</td>
                  <td className="px-5 py-3">
                    <Badge tone={severityTone(log.severity)}>{log.severity}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-faint">{log.ip}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-mute">
                    No matching events.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
