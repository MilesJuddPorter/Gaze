import type { Agent } from "../types";

interface Message {
  id: number;
  agent_id: number | null;
  author_name: string;
  sender_name?: string;
  content: string;
  message_type: string;
  timestamp: string;
  avatar_color?: string;
}

interface Props {
  message: Message;
  prevMessage?: Message;
  agents?: Agent[];
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: true, hour: "numeric", minute: "2-digit" });
}

function highlightMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} className="mention">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function MessageBubble({ message, prevMessage, agents = [] }: Props) {
  const time = formatTime(message.timestamp);
  const name = message.author_name || message.sender_name || "unknown";

  // GazeBot messages (OOO auto-replies)
  if (message.message_type === "system_bot") {
    return (
      <div className="message-bubble msg-gazebot">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "18px" }}>🤖</span>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-dim)" }}>
            GazeBot
          </span>
          <span className="msg-timestamp">{time}</span>
        </div>
        <div className="msg-content" style={{ color: "var(--text-dim)", fontStyle: "italic" }}>
          {highlightMentions(message.content)}
        </div>
      </div>
    );
  }

  // System messages
  if (message.message_type === "system") {
    return (
      <div className="msg-system">
        <span>{message.content}</span>
      </div>
    );
  }

  // Human/user message
  if (!message.agent_id) {
    return (
      <div className="message-bubble msg-human">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "18px" }}>🦝</span>
          <span className="msg-agent-name" style={{ color: "var(--cream)" }}>
            {name}
          </span>
          <span className="msg-timestamp">{time}</span>
        </div>
        <div className="msg-content" style={{ paddingLeft: "28px" }}>
          {highlightMentions(message.content)}
        </div>
      </div>
    );
  }

  // Agent message
  const agent = agents.find((a) => a.id === message.agent_id);

  // Collapse header for consecutive same-agent messages within 5 min
  const sameAuthor = prevMessage?.agent_id === message.agent_id;
  const prevTime = prevMessage ? new Date(prevMessage.timestamp).getTime() : 0;
  const currTime = new Date(message.timestamp).getTime();
  const collapseHeader = sameAuthor && (currTime - prevTime < 5 * 60 * 1000);

  const statusClass = agent
    ? agent.status === "thinking" ? "thinking"
    : agent.status === "acting" ? "active"
    : agent.status === "sleeping" ? "sleeping"
    : "active"
    : "active";

  return (
    <div className="message-bubble">
      {!collapseHeader && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <div className={`avatar avatar-size-sm ${statusClass}`}>🦝</div>
          <span className="msg-agent-name">{name}</span>
          <span className="msg-timestamp">{time}</span>
        </div>
      )}
      <div className="msg-content" style={{ paddingLeft: collapseHeader ? "0" : "46px" }}>
        {message.content.split("\n").map((line, i) => (
          <div key={i}>{highlightMentions(line)}</div>
        ))}
      </div>
    </div>
  );
}
