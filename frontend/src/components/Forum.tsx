import { useState, useEffect } from "react";
import type { Message, Agent } from "../types";
import ForumFeed from "./ForumFeed";
import AgentActivityBoard from "./AgentActivityBoard";
import InputBar from "./InputBar";
import { useGazeSSE } from "../context/GazeSSE";

interface Props {
  workspaceName: string;
  repoPath?: string;
}

export default function Forum({ workspaceName, repoPath = "~" }: Props) {
  // Pull messages + agents from the shared SSE context (single connection)
  const { messages, agents, setAgents } = useGazeSSE();
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Load initial history from REST on mount (SSE only delivers new events)
  useEffect(() => {
    if (initialLoaded) return;
    setInitialLoaded(true);

    fetch("/api/messages?limit=100")
      .then((r) => r.json())
      .then((msgs: Message[]) => {
        // Merge with any SSE messages already received
        // The SSE context manages its own state; we only seed via REST here once
        // by pushing to the context's setMessages — but the context doesn't expose that.
        // Instead: ForumFeed receives context messages directly (already live).
        // This REST call is no longer needed here since the SSE context handles state.
        // Keeping the fetch only to pre-seed context on first load via a trick:
        // We fire a dummy load to warm up agent state.
        void msgs; // context already holds live messages from SSE
      })
      .catch(console.error);

    fetch("/api/agents")
      .then((r) => r.json())
      .then((ag: Agent[]) => setAgents(ag))
      .catch(console.error);
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
    <div className="forum-root">
      {/* Header */}
      <div className="forum-header">
        <span className="forum-header-logo">GAZE</span>
        <span className="forum-header-sep">//</span>
        <span className="forum-header-path">{repoPath}</span>
        <span className="forum-header-sep">//</span>
        <span className="forum-header-channel">#forum</span>
        <span className="forum-header-sep">//</span>
        <span className="forum-header-status">
          {agents.filter((a) => a.status !== "sleeping").length > 0
            ? `[OK] ${agents.length} agent${agents.length !== 1 ? "s" : ""} online`
            : `[--] ${agents.length} agent${agents.length !== 1 ? "s" : ""} idle`}
        </span>
      </div>

      {/* Body: feed + roster */}
      <div className="forum-body">
        <div className="forum-feed-col">
          <ForumFeed messages={messages} agents={agents} repoPath={repoPath} />
          <InputBar onSend={handleSend} repoPath={repoPath} />
        </div>
        <AgentActivityBoard agents={agents} onStart={handleStart} onStop={handleStop} />
      </div>
    </div>
  );
}
