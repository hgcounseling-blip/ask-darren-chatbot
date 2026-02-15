"use client";

import React, { useMemo, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey — I’m here. What’s going on in the relationship right now?" },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function send() {
    if (!canSend) return;

    const userText = input.trim();
    setInput("");
    setError(null);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

      const assistantText = data?.message?.content ?? "Sorry — I didn’t get a response. Try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system" }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Ask Darren (Chatbot)</h1>
      <p style={{ marginTop: 0, color: "#444" }}>Practical relationship help. Faith-based only if you ask.</p>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12, height: "65vh", overflowY: "auto", background: "#fff" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "85%", margin: "6px 0", padding: "10px 12px", borderRadius: 12, border: "1px solid #eee", background: m.role === "user" ? "#f4f6ff" : "#f7f7f7", whiteSpace: "pre-wrap", lineHeight: 1.35 }}>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{m.role === "user" ? "You" : "Darren"}</div>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {error && <div style={{ marginTop: 10, color: "#b00020" }}>{error}</div>}

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message… (Enter to send, Shift+Enter for newline)"
          rows={3}
          style={{ flex: 1, resize: "none", padding: 10, borderRadius: 10, border: "1px solid #ddd", outline: "none" }}
          disabled={isSending}
        />
        <button
          onClick={() => void send()}
          disabled={!canSend}
          style={{ width: 120, borderRadius: 10, border: "1px solid #ddd", background: canSend ? "#111" : "#999", color: "#fff", cursor: canSend ? "pointer" : "not-allowed" }}
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>
    </main>
  );
}
