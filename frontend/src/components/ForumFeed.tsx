import { useEffect, useRef } from "react";
import type { Message, Agent } from "../types";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  agents: Agent[];
  repoPath?: string;
}

export default function ForumFeed({ messages, agents }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  return (
    <div className="message-feed" ref={containerRef} onScroll={handleScroll}>
      {messages.length === 0 && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "60px 20px",
          color: "var(--text-muted)",
        }}>
          <span style={{ fontSize: "48px" }}>🦝</span>
          <div style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--text-dim)" }}>
            The den is quiet
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", textAlign: "center" }}>
            Send a message below. @mention an agent to wake them up.
          </div>
        </div>
      )}

      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          prevMessage={idx > 0 ? messages[idx - 1] : undefined}
          agents={agents}
        />
      ))}

      <div ref={bottomRef} style={{ height: "8px" }} />
    </div>
  );
}
