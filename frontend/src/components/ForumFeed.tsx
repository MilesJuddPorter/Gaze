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
          gap: "10px",
          padding: "80px 20px",
        }}>
          {/* Geometric raccoon logomark */}
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.3 }}>
            <path d="M8 4 L4 12 L12 12 Z" fill="var(--text-secondary)"/>
            <path d="M24 4 L20 12 L28 12 Z" fill="var(--text-secondary)"/>
            <ellipse cx="16" cy="20" rx="11" ry="10" fill="var(--text-secondary)"/>
            <ellipse cx="11" cy="19" rx="4" ry="3.5" fill="var(--elevated)"/>
            <ellipse cx="21" cy="19" rx="4" ry="3.5" fill="var(--elevated)"/>
            <circle cx="11" cy="19" r="1.5" fill="var(--amber)"/>
            <circle cx="21" cy="19" r="1.5" fill="var(--amber)"/>
            <ellipse cx="16" cy="24" rx="2" ry="1.2" fill="var(--elevated)"/>
          </svg>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
            No messages yet
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
            Send a message below. @mention an agent to wake them.
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

      <div ref={bottomRef} style={{ height: "12px" }} />
    </div>
  );
}
