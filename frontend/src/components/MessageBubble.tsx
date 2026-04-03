import RaccoonAvatar from "./RaccoonAvatar";
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
  return new Date(ts).toLocaleTimeString("en-US", {
    hour12: true, hour: "numeric", minute: "2-digit",
  });
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
  const name = message.author_name || message.sender_name || "Unknown";

  // GazeBot OOO message
  if (message.message_type === "system_bot") {
    return (
      <div className="message-gazebot">
        <div className="message-gazebot-label">GAZE</div>
        <div className="message-gazebot-content">
          {highlightMentions(message.content)}
        </div>
      </div>
    );
  }

  // System message
  if (message.message_type === "system") {
    return (
      <div className="message-system">
        <span>{message.content}</span>
      </div>
    );
  }

  const agent = agents.find((a) => a.id === message.agent_id);
  const isHuman = !message.agent_id;
  const color = agent?.avatar_color || "#8B95A3";
  const initial = name.charAt(0).toUpperCase();

  // Collapse header for consecutive same-agent messages within 5 min
  const sameAuthor = prevMessage?.agent_id === message.agent_id
    && prevMessage?.author_name === message.author_name;
  const prevTime = prevMessage ? new Date(prevMessage.timestamp).getTime() : 0;
  const currTime = new Date(message.timestamp).getTime();
  const collapseHeader = sameAuthor && (currTime - prevTime < 5 * 60 * 1000);

  const avatarClass = isHuman ? "" :
    agent?.status === "thinking" ? "thinking" :
    agent?.status === "acting" ? "active" : "";

  return (
    <div className="message-row">
      {!collapseHeader && (
        <div className="message-header">
          <RaccoonAvatar
            status={isHuman ? "idle" : (agent && !!agent.is_ooo ? "ooo" : (agent?.status ?? "idle"))}
            color={color}
            size={34}
          />
          <span className="message-author">
            {isHuman ? "You" : name}
          </span>
          <span className="message-time">{time}</span>
        </div>
      )}
      <div
        className="message-content"
        style={collapseHeader ? { paddingLeft: 0 } : undefined}
      >
        {message.content.split("\n").map((line, i) => (
          <div key={i}>{highlightMentions(line)}</div>
        ))}
      </div>
    </div>
  );
}
