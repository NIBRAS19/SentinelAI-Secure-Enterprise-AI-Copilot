"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DocumentTable } from "@/components/knowledge/document-table";
import { UploadDialog } from "@/components/knowledge/upload-dialog";
import { collections as seedCollections, documents as seedDocuments, knowledgeTotals } from "@/lib/mock/documents";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/lib/types";

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>(seedDocuments);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = activeCollection ? documents.filter((d) => d.collectionId === activeCollection) : documents;

  function handleUploaded(filename: string) {
    const newDoc: DocumentItem = {
      id: `doc-new-${Date.now()}`,
      name: filename,
      collectionId: activeCollection ?? seedCollections[0].id,
      mimeType: "application/octet-stream",
      status: "READY",
      securityStatus: "SAFE",
      piiStatus: "none",
      owner: "You",
      chunkCount: Math.floor(Math.random() * 60) + 10,
      visibility: "internal",
      allowedRoles: [],
      updatedAt: "Just now",
      createdAt: new Date().toISOString().slice(0, 10),
      sizeKb: 120,
    };
    setDocuments((prev) => [newDoc, ...prev]);
  }

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Knowledge"
        description={`Showing ${filtered.length} of ${knowledgeTotals.documents} documents across the organization.`}
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" />
            Upload
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCollection(null)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm",
            activeCollection === null ? "border-gold/40 bg-gold/10 text-gold" : "border-line text-mute hover:bg-panel-raised"
          )}
        >
          All collections
        </button>
        {seedCollections.map((col) => {
          const count = documents.filter((d) => d.collectionId === col.id).length;
          const active = activeCollection === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setActiveCollection(active ? null : col.id)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm",
                active ? "border-gold/40 bg-gold/10 text-gold" : "border-line text-mute hover:bg-panel-raised"
              )}
            >
              {col.name} <span className="text-faint">({count})</span>
            </button>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <DocumentTable documents={filtered} />
      </Card>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />
    </div>
  );
}
