import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approvalStatusTone, riskTone } from "@/lib/utils";
import type { AgentTool, ApprovalRequest } from "@/lib/types";

export function ToolBadgeRow({ tools }: { tools: AgentTool[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.map((t) => (
        <span key={t.id} className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-mute">
          {t.name}
          <Badge tone={riskTone(t.risk)}>{t.risk}</Badge>
          {t.networkAccess && <Globe className="h-3 w-3 text-faint" />}
        </span>
      ))}
    </div>
  );
}

export function ApprovalCard({
  request,
  onApprove,
  onReject,
}: {
  request: ApprovalRequest;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const pending = request.status === "pending";

  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-paper">
            <span className="font-medium">{request.agentName}</span> wants to execute
          </p>
          <p className="mt-1 font-mono text-sm text-signal">{request.tool}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={riskTone(request.riskLevel)}>{request.riskLevel} risk</Badge>
          <Badge tone={approvalStatusTone(request.status)}>{request.status}</Badge>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-line bg-ink px-3 py-2">
        <p className="font-mono text-xs text-mute">{request.payloadSummary}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-faint">Requested by</dt>
          <dd className="mt-0.5 text-paper">{request.requestedBy}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-faint">Reason</dt>
          <dd className="mt-0.5 text-paper">{request.reason}</dd>
        </div>
        <div>
          <dt className="text-faint">{pending ? "Requested" : "Resolved"}</dt>
          <dd className="mt-0.5 font-mono text-paper">{pending ? request.timestamp : request.resolvedAt ?? request.timestamp}</dd>
        </div>
      </dl>

      {pending ? (
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" onClick={onApprove}>
            Approve
          </Button>
          <Button size="sm" variant="danger" onClick={onReject}>
            Reject
          </Button>
        </div>
      ) : (
        request.resolvedBy && <p className="mt-3 text-xs text-faint">Resolved by {request.resolvedBy}</p>
      )}
    </div>
  );
}
