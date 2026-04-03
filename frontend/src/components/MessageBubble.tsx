import React from "react";
import type { Message, Agent } from "../types";

interface Props {
  message: Message;
  agents: Agent[];
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp.endsWith("Z") ? timestamp : timestamp + "Z");
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function parseContent(content: string, agents: Agent[]): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const mentionRegex = /@(\w+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="mention">
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

export default function MessageBubble({ message, agents }: Props) {
  // System message — centered italic style
  if (message.message_type === "system") {
    return (
      <div className="message-system">
        {message.content}
      </div>
    );
  }

  const agent = agents.find((a) => a.id === message.agent_id);
  const isHuman = !agent;

  if (isHuman) {
    return (
      <div className="message-bubble">
        <div className="message-avatar" style={{ background: "var(--bg)", color: "var(--text-dim)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 }}>
          Y
        </div>
        <div className="message-body">
          <div className="message-meta">
            <span className="message-author">{message.author_name}</span>
            <span className="message-time">{formatTime(message.timestamp)}</span>
          </div>
          <div className="message-content">{parseContent(message.content, agents)}</div>
        </div>
      </div>
    );
  }

  const initial = (agent.name[0] ?? "?").toUpperCase();
  const avatarBg = agent.avatar_color ?? "#33ff00";

  return (
    <div className="message-bubble">
      <div
        className="message-avatar"
        style={{ background: avatarBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 }}
      >
        {initial}
      </div>
      <div className="message-body">
        <div className="message-meta">
          <span className="message-author">{message.author_name}</span>
          <span className="message-role">{agent.role}</span>
          <span className="message-time">{formatTime(message.timestamp)}</span>
        </div>
        <div className="message-content">{parseContent(message.content, agents)}</div>
      </div>
    </div>
  );
}
