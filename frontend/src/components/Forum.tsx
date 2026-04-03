import React, { useState, useEffect, useCallback } from "react";
import type { Message, Agent } from "../types";
import MessageFeed from "./MessageFeed";
import AgentRoster from "./AgentRoster";
import InputBar from "./InputBar";

interface Props {
  workspaceName: string;
  repoPath?: string;
}

export default function Forum({ workspaceName, repoPath = "~" }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  // Load initial data
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

  // SSE stream
  useEffect(() => {
    let es: EventSource;

    const connect = () => {
      es = new EventSource("/api/messages/stream");

      es.addEventListener("message", (e) => {
        const msg: Message = JSON.parse(e.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      });

      es.addEventListener("agent_status", (e) => {
        const { agentId, status, action } = JSON.parse(e.data);
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId
              ? { ...a, status, current_action: action }
              : a
          )
        );
      });

      es.onerror = () => {
        es.close();
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => es?.close();
  }, []);

  const handleSend = useCallback(async (content: string) => {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }, []);

  const handleStart = useCallback(async () => {
    await fetch("/api/agents/start", { method: "POST" }).catch(console.error);
    fetch("/api/agents").then((r) => r.json()).then(setAgents).catch(console.error);
  }, []);

  const handleStop = useCallback(async () => {
    await fetch("/api/agents/stop", { method: "POST" }).catch(console.error);
    fetch("/api/agents").then((r) => r.json()).then(setAgents).catch(console.error);
  }, []);

  return (
    <div className="forum">
      <div className="forum-header">
        <div className="header-workspace">
          <span className="header-icon">👁</span>
          <span className="header-name">{workspaceName}</span>
          <span className="header-channel">#forum</span>
        </div>
      </div>

      <div className="forum-body">
        <div className="forum-main">
          <MessageFeed messages={messages} agents={agents} />
          <InputBar onSend={handleSend} />
        </div>

        <AgentRoster agents={agents} onStart={handleStart} onStop={handleStop} />
      </div>
    </div>
  );
}
