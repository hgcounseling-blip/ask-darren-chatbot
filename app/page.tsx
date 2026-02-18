
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type ChatMessage = { role: Role; content: string };

const STORAGE_KEY = "askDarrenMessages";

const DEFAULT_GREETING: ChatMessage = {
  role: "assistant",
  content: "Hey — I’m here. What’s going on in the relationship right now?",
};

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_GREETING]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const hasLoadedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load saved chat
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every(
            (m: any) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string"
          )
        ) {
          setMessages(parsed);
        }
      }
    } catch {}
    hasLoadedRef.current = true;
  }, []);

  // Save chat after load
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isSending,
    [input, isSending]
  );

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

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userText },
    ];

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const raw = await res.text();
        throw new Error(
          `Server returned non-JSON (${res.status}). ${raw.slice(0, 140)}`
        );
      }

      const data = (await res.json()) as { reply?: string; error?: string };

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const reply =
        typeof data?.reply === "string" && data.reply.trim().length > 0
          ? data.reply
          : "I didn’t get that—could you say it a different way?";

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

  const colors = {
    bg: "#0b0b0b",
    panel: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.14)",
    text: "#f5f5f5",
    muted: "rgba(245,245,245,0.75)",
    userBubble: "rgba(255,255,255,0.14)",
    botBubble: "rgba(255,255,255,0.08)",
    inputBg: "rgba(0,0,0,0.35)",
    btnEnabled: "rgba(255,255,255,0.14)",
    btnDisabled: "rgba(255,255,255,0.06)",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.text,
        display: "flex",
        justifyContent: "center",
        padding: 20,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Header */}
        <header
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: "14px 16px",
            background: colors.panel,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>Ask Darren</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: colors.muted }}>
              Enter to send • Shift+Enter for a new line
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            disabled={isSending}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              background: "rgba(255,255,255,0.08)",
              color: colors.text,
              cursor: isSending ? "not-allowed" : "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Clear chat
          </button>
        </header>

        {/* Chat */}
        <section
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: 12,
            background: colors.panel,
            minHeight: "60vh",
            overflow: "auto",
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
                    maxWidth: "85%",
                    whiteSpace: "pre-wrap",
                    padding: "10px 12px",
                    borderRadius: 16,
                    border: `1px solid ${colors.border}`,
                    background: isUser ? colors.userBubble : colors.botBubble,
                    lineHeight: 1.45,
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        fontSize: 12,
                        color: colors.muted,
                        marginBottom: 6,
                      }}
                    >
                      Darren
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            );
          })}

          {isSending && (
            <div style={{ marginTop: 8, color: colors.muted, fontSize: 13 }}>
              Darren is typing…
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        {/* Composer */}
        <footer style={{ display: "flex", gap: 10 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message…"
            rows={2}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              resize: "none",
              outline: "none",
              background: colors.inputBg,
              color: colors.text,
              lineHeight: 1.4,
              fontSize: 15,
            }}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            style={{
              padding: "0 16px",
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              background: canSend ? colors.btnEnabled : colors.btnDisabled,
              color: colors.text,
              cursor: canSend ? "pointer" : "not-allowed",
              minWidth: 100,
              fontWeight: 700,
            }}
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </footer>

        <div style={{ fontSize: 12, color: colors.muted }}>
          If you’re in immediate danger, call 911. If you’re thinking about
          self-harm, call or text 988 (U.S.).
        </div>
      </div>
    </main>
  );
}

