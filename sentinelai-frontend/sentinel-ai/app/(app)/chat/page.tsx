"use client";

import { useState } from "react";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatPanel } from "@/components/chat/chat-panel";
import { conversations as seedConversations, generateAssistantReply, nextMessageId } from "@/lib/mock/conversations";
import { useAuth } from "@/lib/auth-context";
import type { Conversation } from "@/lib/types";

export default function ChatPage() {
  const { role } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [activeId, setActiveId] = useState(seedConversations[0].id);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  function handleNew() {
    const id = `conv-${Date.now()}`;
    const fresh: Conversation = {
      id,
      title: "New conversation",
      assistant: "General Assistant",
      updatedAt: "Just now",
      messages: [],
    };
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(id);
    setDraft("");
  }

  function handleSend() {
    const text = draft.trim();
    if (!text) return;

    const userMsg = { id: nextMessageId(), role: "user" as const, content: text, timestamp: "Just now" };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? {
              ...c,
              messages: [...c.messages, userMsg],
              title: c.messages.length === 0 ? text.slice(0, 48) : c.title,
              updatedAt: "Just now",
            }
          : c
      )
    );
    setDraft("");
    setSending(true);

    // Simulated latency stands in for authz → retrieval → rerank → LLM.
    setTimeout(() => {
      const reply = generateAssistantReply(text, role);
      const assistantMsg = {
        id: nextMessageId(),
        role: "assistant" as const,
        content: reply.content,
        citations: reply.citations,
        confidence: reply.confidence,
        restricted: reply.restricted,
        timestamp: "Just now",
      };
      setConversations((prev) => prev.map((c) => (c.id === activeId ? { ...c, messages: [...c.messages, assistantMsg] } : c)));
      setSending(false);
    }, 900);
  }

  return (
    <div className="flex h-full">
      <ConversationList conversations={conversations} activeId={active.id} onSelect={setActiveId} onNew={handleNew} />
      <ChatPanel conversation={active} draft={draft} onDraftChange={setDraft} onSend={handleSend} sending={sending} />
    </div>
  );
}
