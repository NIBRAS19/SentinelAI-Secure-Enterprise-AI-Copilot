"use client";

import { useEffect, useRef } from "react";
import { Send, ShieldOff, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Conversation } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";

export function ChatPanel({
  conversation,
  draft,
  onDraftChange,
  onSend,
  sending,
}: {
  conversation: Conversation;
  draft: string;
  onDraftChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  const { user } = useAuth();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation.id, conversation.messages.length, sending]);

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="border-b border-line px-6 py-3">
        <p className="text-sm font-medium text-paper">{conversation.assistant}</p>
        <p className="text-xs text-faint">Responses are grounded in your organization&apos;s authorized knowledge sources.</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {conversation.messages.length === 0 && (
            <p className="pt-12 text-center text-sm text-faint">Ask a question to get started.</p>
          )}
          {conversation.messages.map((m) => (
            <MessageBubble key={m.id} message={m} userName={user.name} userColor={user.avatarColor} />
          ))}
          {sending && (
            <div className="flex items-center gap-1.5 pl-9">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint [animation-delay:300ms]" />
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-line p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim() && !sending) onSend();
          }}
          className="mx-auto flex max-w-2xl items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder="Ask anything grounded in your knowledge base..."
            className="flex-1 rounded-md border border-line bg-ink px-3 py-2.5 text-sm text-paper placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-signal/60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gold text-ink disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, userName, userColor }: { message: ChatMessage; userName: string; userColor: string }) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3">
        <div className="max-w-md rounded-lg rounded-tr-sm bg-panel-raised px-4 py-2.5 text-sm text-paper">{message.content}</div>
        <Avatar name={userName} colorClass={userColor} size="sm" />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-signal/15">
        <span className="h-2 w-2 rounded-full bg-signal" />
      </span>
      <div className="max-w-lg space-y-2">
        <div
          className={cn(
            "rounded-lg rounded-tl-sm border px-4 py-2.5 text-sm text-paper",
            message.restricted ? "border-status-critical/25 bg-status-critical/5" : "border-line bg-panel"
          )}
        >
          {message.restricted && (
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-status-critical">
              <ShieldOff className="h-3.5 w-3.5" />
              Access restricted for your role
            </div>
          )}
          {message.content}
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="space-y-1 rounded-md border border-line bg-panel/60 p-2.5">
            <p className="px-1 text-xs text-faint">Sources</p>
            {message.citations.map((c) => (
              <div
                key={c.documentId + (c.page ?? "")}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-xs text-mute hover:bg-panel-raised"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-faint" />
                <span className="truncate">{c.documentName}</span>
                {c.page && <span className="shrink-0 text-faint">p. {c.page}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
