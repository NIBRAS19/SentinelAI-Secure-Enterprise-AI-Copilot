"use client";

import { useRouter } from "next/navigation";
import { FileText, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { documentStatusTone } from "@/lib/utils";
import type { DocumentItem } from "@/lib/types";

export function DocumentTable({ documents }: { documents: DocumentItem[] }) {
  const router = useRouter();

  if (documents.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-mute">No documents in this collection yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Document</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Status</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Owner</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Chunks</th>
            <th className="px-5 py-2.5 text-xs font-medium text-mute">Updated</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr
              key={doc.id}
              onClick={() => router.push(`/knowledge/${doc.id}`)}
              className="cursor-pointer border-b border-line/60 hover:bg-panel-raised"
            >
              <td className="px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-faint" />
                  <span className="text-paper">{doc.name}</span>
                  {doc.securityStatus !== "SAFE" && <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-status-warn" />}
                  {doc.visibility === "restricted" && <Badge tone="gold">Restricted</Badge>}
                </div>
              </td>
              <td className="px-5 py-3">
                <Badge tone={documentStatusTone(doc.status)}>{doc.status}</Badge>
              </td>
              <td className="px-5 py-3 text-mute">{doc.owner}</td>
              <td className="px-5 py-3 font-mono text-xs text-mute">{doc.chunkCount || "—"}</td>
              <td className="px-5 py-3 font-mono text-xs text-faint">{doc.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
