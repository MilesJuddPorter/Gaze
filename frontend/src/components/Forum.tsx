import { useState, useEffect } from "react";
import type { Message, Agent } from "../types";
import ForumFeed from "./ForumFeed";
import AgentRoster from "./AgentRoster";
import InputBar from "./InputBar";

interface Props {
  workspaceName: string;
}

export default function Forum({ workspaceName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    fetch("/api/messages?limit=100")
      .then((r) => r.json())
      .then(setMessages)
      .catch(console.error);

    fetch("/api/agents")
      .then((r) => r.json())
      .then(setAgents)
      .catch(console.error);
  }, []);

  // SSE stream: server sends named events via /api/messages/stream
  useEffect(() => {
    let es: EventSource;

    const connect = () => {
      es = new EventSource("/api/messages/stream");

      // Named "message" event — new chat message posted
      es.addEventListener("message", (e) => {
        try {
          const msg = JSON.parse(e.data);
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        } catch { /* ignore */ }
      });

      // Named "agent_status" event — agent state changed
      es.addEventListener("agent_status", (e) => {
        try {
          const { agentId, status, action } = JSON.parse(e.data);
          setAgents((prev) =>
            prev.map((a) =>
              a.id === agentId ? { ...a, status, current_action: action } : a
            )
          );
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        es.close();
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => es?.close();
  }, []);

  async function handleSend(content: string) {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async function handleStart() {
    await fetch("/api/agents/start", { method: "POST" }).catch(console.error);
    fetch("/api/agents").then((r) => r.json()).then(setAgents).catch(console.error);
  }

  async function handleStop() {
    await fetch("/api/agents/stop", { method: "POST" }).catch(console.error);
    fetch("/api/agents").then((r) => r.json()).then(setAgents).catch(console.error);
  }

  return (
    <div className="forum">
      <div className="forum-header">
        <div className="header-workspace">
          <span className="header-icon">&#9679;</span>
          <span className="header-name">{workspaceName}</span>
        </div>
        <span className="header-channel">#forum</span>
      </div>

      <div className="forum-body">
        <div className="forum-main">
          <ForumFeed messages={messages} agents={agents} />
          <InputBar onSend={handleSend} />
        </div>
        <AgentRoster agents={agents} onStart={handleStart} onStop={handleStop} />
      </div>
    </div>
  );
}
