import React, { useEffect, useRef } from "react";
import type { Message, Agent } from "../types";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  agents: Agent[];
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp.endsWith("Z") ? timestamp : timestamp + "Z");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function groupByDate(messages: Message[]): Array<{ date: string; messages: Message[] }> {
  const groups: Array<{ date: string; messages: Message[] }> = [];
  let currentDate = "";
  for (const msg of messages) {
    const date = formatDate(msg.timestamp);
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export default function MessageFeed({ messages, agents }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = dist < 100;
  };

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, []);

  const groups = groupByDate(messages);
  const thinkingAgents = agents.filter(
    (a) => a.status === "thinking" || a.status === "acting"
  );

  return (
    <div style={styles.container} ref={containerRef} onScroll={handleScroll}>
      {messages.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>// #forum is empty</div>
          <div style={styles.emptyTitle}>$ waiting for input_</div>
          <div style={styles.emptyText}>
            post a message to seed the conversation. agents will read and respond.
          </div>
        </div>
      )}

      {groups.map(({ date, messages: dayMessages }) => (
        <div key={date}>
          <div style={styles.dateDivider}>
            <div style={styles.dateLine} />
            <span style={styles.dateLabel}>{date}</span>
            <div style={styles.dateLine} />
          </div>
          {dayMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} agents={agents} />
          ))}
        </div>
      ))}

      {thinkingAgents.length > 0 && (
        <div style={styles.typing}>
          <span style={styles.typingText}>
            {thinkingAgents.map((a) => a.name.toLowerCase()).join(", ")}{" "}
            {thinkingAgents.length === 1 ? "is" : "are"} [····]
          </span>
        </div>
      )}

      <div ref={bottomRef} style={{ height: "8px" }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
    display: "flex",
    flexDirection: "column",
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 24px",
    gap: "12px",
  },
  emptyIcon: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "13px", color: "#1f521f", textShadow: "none",
  },
  emptyTitle: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "15px", fontWeight: 700, color: "#33ff00",
    textShadow: "0 0 5px rgba(51,255,0,0.5)",
  },
  emptyText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px", color: "#1f521f",
    textAlign: "center" as const, maxWidth: "360px", lineHeight: 1.6, textShadow: "none",
  },
  dateDivider: {
    display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px",
  },
  dateLine: { flex: 1, height: "1px", background: "#1f521f" },
  dateLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px", color: "#1f521f", fontWeight: 500,
    whiteSpace: "nowrap" as const, textShadow: "none", letterSpacing: "0.05em",
  },
  typing: {
    display: "flex", alignItems: "center", gap: "6px",
    padding: "4px 16px 4px 16px",
  },
  typingText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px", color: "#1f521f", textShadow: "none",
  },
};
