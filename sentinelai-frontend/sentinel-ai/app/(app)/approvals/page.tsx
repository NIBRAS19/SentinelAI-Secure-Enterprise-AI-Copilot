"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/misc";
import { ApprovalCard } from "@/components/agents/agent-components";
import { approvalRequests as seedApprovals } from "@/lib/mock/agents";
import { useAuth } from "@/lib/auth-context";
import type { ApprovalRequest } from "@/lib/types";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>(seedApprovals);

  function resolve(id: string, status: "approved" | "rejected") {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status, resolvedBy: user.name, resolvedAt: "Just now" } : r)));
  }

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div className="p-6 md:p-8">
      <PageHeader title="Approvals" description="High-risk agent actions pause here until a person with the right role signs off." />

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-medium text-mute">Pending ({pending.length})</h2>
          {pending.length === 0 ? (
            <p className="rounded-md border border-dashed border-line px-5 py-8 text-center text-sm text-mute">
              Nothing waiting on you right now.
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <ApprovalCard
                  key={req.id}
                  request={req}
                  onApprove={() => resolve(req.id, "approved")}
                  onReject={() => resolve(req.id, "rejected")}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-mute">History</h2>
          <div className="space-y-3">
            {resolved.map((req) => (
              <ApprovalCard key={req.id} request={req} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
