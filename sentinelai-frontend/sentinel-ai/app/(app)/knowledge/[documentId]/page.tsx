"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AccessRestricted, EmptyState } from "@/components/ui/misc";
import { getDocument, getCollection } from "@/lib/mock/documents";
import { useAuth } from "@/lib/auth-context";
import { documentStatusTone } from "@/lib/utils";

export default function DocumentDetailPage({ params }: { params: { documentId: string } }) {
  const { role } = useAuth();
  const doc = getDocument(params.documentId);

  if (!doc) {
    return (
      <div className="p-6 md:p-8">
        <BackLink />
        <EmptyState
          title="Document not found"
          description="This one isn't in the seed dataset — likely something uploaded earlier in this session, which only lives in that page's local state."
        />
      </div>
    );
  }

  const restricted = doc.visibility === "restricted" && !doc.allowedRoles.includes(role);
  const collection = getCollection(doc.collectionId);

  return (
    <div className="p-6 md:p-8">
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-paper">{doc.name}</h1>
          <p className="mt-1 text-sm text-mute">{collection?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={documentStatusTone(doc.status)}>{doc.status}</Badge>
          {doc.visibility === "restricted" && <Badge tone="gold">Restricted</Badge>}
        </div>
      </div>

      {restricted ? (
        <AccessRestricted resource="this document" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-4 text-sm sm:grid-cols-3">
                <Field label="Owner" value={doc.owner} />
                <Field label="Collection" value={collection?.name ?? "—"} />
                <Field label="File type" value={doc.mimeType.split("/").pop() ?? doc.mimeType} mono />
                <Field label="Chunks" value={String(doc.chunkCount)} mono />
                <Field label="Size" value={`${(doc.sizeKb / 1024).toFixed(1)} MB`} mono />
                <Field label="Visibility" value={doc.visibility} />
                <Field label="Created" value={doc.createdAt} mono />
                <Field label="Updated" value={doc.updatedAt} mono />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScanRow
                ok={doc.securityStatus === "SAFE"}
                title="Prompt injection scan"
                label={doc.securityStatus === "SAFE" ? "No malicious instruction detected" : "Prompt injection detected"}
              />
              <ScanRow
                ok={doc.piiStatus === "none"}
                title="PII scan"
                label={doc.piiStatus === "none" ? "No high-risk PII detected" : `PII detected — ${doc.piiStatus}`}
              />
              <ScanRow ok title="Integrity" label="File validated" />

              {doc.securityStatus !== "SAFE" && (
                <div className="rounded-md border border-status-warn/25 bg-status-warn/5 p-3">
                  <p className="mb-1 text-xs font-medium text-status-warn">Flagged content</p>
                  <p className="font-mono text-xs text-mute">{doc.flaggedSnippet}</p>
                  {doc.flaggedReason && <p className="mt-2 text-xs text-faint">{doc.flaggedReason}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/knowledge" className="mb-6 inline-flex items-center gap-1.5 text-sm text-mute hover:text-paper">
      <ArrowLeft className="h-4 w-4" />
      Back to Knowledge
    </Link>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-faint">{label}</dt>
      <dd className={mono ? "mt-0.5 font-mono text-xs text-paper" : "mt-0.5 text-paper"}>{value}</dd>
    </div>
  );
}

function ScanRow({ ok, label, title }: { ok: boolean; label: string; title: string }) {
  return (
    <div>
      <p className="text-xs text-faint">{title}</p>
      <div className="mt-1 flex items-center gap-2">
        {ok ? <ShieldCheck className="h-4 w-4 text-status-safe" /> : <ShieldAlert className="h-4 w-4 text-status-warn" />}
        <span className="text-sm text-paper">{label}</span>
      </div>
    </div>
  );
}
