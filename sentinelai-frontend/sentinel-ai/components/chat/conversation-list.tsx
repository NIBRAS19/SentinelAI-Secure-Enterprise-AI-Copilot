"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-line">
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-paper hover:bg-panel-raised"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "mb-1 block w-full rounded-md px-3 py-2.5 text-left",
              c.id === activeId ? "bg-panel-raised" : "hover:bg-panel-raised"
            )}
          >
            <p className="truncate text-sm text-paper">{c.title}</p>
            <p className="mt-0.5 text-xs text-faint">{c.updatedAt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
