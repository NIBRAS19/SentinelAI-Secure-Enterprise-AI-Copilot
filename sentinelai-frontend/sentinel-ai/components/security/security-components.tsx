import { Badge } from "@/components/ui/badge";
import { severityTone } from "@/lib/utils";
import type { SecurityEvent } from "@/lib/types";

export function SecurityEventsTable({ events }: { events: SecurityEvent[] }) {
  if (events.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-mute">No events in this window.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Timestamp</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Event</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">User</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Resource</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Severity</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr key={e.id} className="border-b border-line/60">
              <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-faint">{e.timestamp}</td>
              <td className="px-5 py-3">
                <p className="font-mono text-xs text-paper">{e.type}</p>
                <p className="mt-0.5 max-w-xs text-xs text-mute">{e.description}</p>
              </td>
              <td className="px-5 py-3 text-mute">{e.user ?? "—"}</td>
              <td className="px-5 py-3 text-mute">{e.resource ?? "—"}</td>
              <td className="px-5 py-3">
                <Badge tone={severityTone(e.severity)}>{e.severity}</Badge>
              </td>
              <td className="px-5 py-3 capitalize text-mute">{e.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
