import { useEffect, useRef } from "react";
import type { Message, Agent } from "../types";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
  agents: Agent[];
  repoPath?: string;
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
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

export default function ForumFeed({ messages, agents }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isAtBottomRef.current = distFromBottom < 100;
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

  return (
    <div className="message-feed" ref={containerRef} onScroll={handleScroll}>
      {messages.length === 0 && (
        <div className="message-empty">
          <div className="message-empty-icon">💬</div>
          <div className="message-empty-title">No messages yet</div>
          <div className="message-empty-text">
            Send a message below to start the conversation. Agents will respond based on their roles.
          </div>
        </div>
      )}

      {groups.map(({ date, messages: dayMessages }) => (
        <div key={date}>
          <div className="date-divider">
            <div className="date-line" />
            <span className="date-label">{date}</span>
            <div className="date-line" />
          </div>

          {dayMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              
            />
          ))}
        </div>
      ))}

      <div ref={bottomRef} style={{ height: "8px" }} />
    </div>
  );
}
