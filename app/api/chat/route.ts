"use client";

import React, { useEffect, useMemo, useState } from "react";

type Role = "user" | "assistant";
type ChatMessage = { role: Role; content: string };

const STORAGE_KEY = "askDarrenMessages";

const DEFAULT_GREETING: ChatMessage = {
  role: "assistant",
  content: "Hey — I’m here. What’s going on in the relationship right now?",
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Load saved chat on first render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // Save chat whenever messages change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota/errors
    }
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  const handleClear = () => {
    setMessages([DEFAULT_GREETING]);
    setInput("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userText = input.trim();
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: userText }];

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      // Read once safely (handles HTML error pages too)
      const text = await res.text();

      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { reply: `Server returned non-JSON (${res.status}): ${text.slice(0, 200)}` };
      }

      if (!res.ok) {
        throw new Error(data?.reply || `Request failed (${res.status})`);
      }

      const reply: string =
        (typeof data?.reply === "string" && data.reply.trim()) ||
        "I didn’t get that—could you say it a different way?";

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      const msg = err?.message || "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `ERROR: ${msg}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Ask Darren</h1>

        <button
          type="button"
          onClick={handleClear}
          disabled={isSending}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: isSending ? "not-allowed" : "pointer",
          }}
        >
          Clear chat
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          padding: 12,
          minHeight: 420,
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                margin: "10px 0",
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  whiteSpace: "pre-wrap",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #e0e0e0",
                  background: isUser ? "#ffffff" : "#f2f2f2",
                }}
              >
                {!isUser && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Darren</div>
                )}
                {m.content}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message…"
          rows={2}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 14,
            border: "1px solid #ddd",
            resize: "none",
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            padding: "0 16px",
            borderRadius: 14,
            border: "1px solid #ddd",
            background: canSend ? "#fff" : "#f4f4f4",
            cursor: canSend ? "pointer" : "not-allowed",
            minWidth: 92,
          }}
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Tip: Press Enter to send, Shift+Enter for a new line.
      </div>
    </main>
  );
}
