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
  repoPath?: string;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function highlightMentions(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} className="mention">{part}</span>
      : <span key={i}>{part}</span>
  );
}

export default function MessageBubble({ message, prevMessage, repoPath = "~" }: Props) {
  const time = formatTime(message.timestamp);
  const name = message.author_name || message.sender_name || "unknown";

  // System message
  if (message.message_type === "system") {
    return (
      <div className="msg-system">
        <span>// {message.content}</span>
        <span>{time}</span>
      </div>
    );
  }

  // Human/user message
  if (!message.agent_id) {
    return (
      <div className="msg-human">
        <span className="msg-human-prompt">you@gaze:{repoPath}$ </span>
        {highlightMentions(message.content)}
      </div>
    );
  }

  // Agent message
  const color = message.avatar_color || "#33ff00";
  const glow = `0 0 5px ${color}80`;

  // Collapse header for consecutive messages from same agent within 5 min
  const sameAuthor = prevMessage?.agent_id === message.agent_id;
  const prevTime = prevMessage ? new Date(prevMessage.timestamp).getTime() : 0;
  const currTime = new Date(message.timestamp).getTime();
  const withinWindow = currTime - prevTime < 5 * 60 * 1000;
  const collapseHeader = sameAuthor && withinWindow;

  return (
    <div className="msg-agent">
      {!collapseHeader && (
        <div className="msg-agent-header">
          <span
            className="msg-agent-name"
            style={{ color, textShadow: glow }}
          >
            [{name.toUpperCase()}]
          </span>
          <span className="msg-agent-time">{time}</span>
        </div>
      )}
      {message.content.split("\n").map((line, i) => (
        <div key={i} className="msg-agent-line">
          {highlightMentions(line)}
        </div>
      ))}
    </div>
  );
}
