import { useState, useEffect } from "react";
import type { Message, Agent } from "../types";
import ForumFeed from "./ForumFeed";
import AgentRoster from "./AgentRoster";
import InputBar from "./InputBar";
import DmPanel from "./DmPanel";
import { useGazeSSE } from "../context/GazeSSE";

interface Props {
  workspaceName: string;
  repoPath?: string;
}

export default function Forum({ workspaceName, repoPath = "~" }: Props) {
  const { messages, agents, setAgents } = useGazeSSE();
  const [initialLoaded, setInitialLoaded] = useState(false);
  // Agents auto-run while server is up — no manual start/stop needed
  const [dmPanelOpen, setDmPanelOpen] = useState(false);

  useEffect(() => {
    if (initialLoaded) return;
    setInitialLoaded(true);

    fetch("/api/agents")
      .then((r) => r.json())
      .then((ag: Agent[]) => { setAgents(ag); })
      .catch(console.error);
  }, []);

  async function handleSend(content: string) {
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async function handleToggleOoo(agentId: number, isOoo: boolean) {
    try {
      await fetch(`/api/agents/${agentId}/ooo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_ooo: isOoo }),
      });
      setAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, is_ooo: isOoo ? 1 : 0 } : a));
    } catch (e) {
      console.error(e);
    }
  }

  const activeCount = agents.filter((a) => a.status !== "sleeping" && !a.is_ooo).length;
  const statusText = activeCount > 0
    ? `🌙 ${agents.length} in the den`
    : `💤 ${agents.length} sleeping`;

  return (
    <div className="forum-root">
      {/* Header */}
      <div className="forum-header">
        <div className="forum-header-logo">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <path d="M8 4 L4 12 L12 12 Z" fill="var(--text-primary)"/>
            <path d="M24 4 L20 12 L28 12 Z" fill="var(--text-primary)"/>
            <ellipse cx="16" cy="20" rx="11" ry="10" fill="var(--text-primary)"/>
            <ellipse cx="11" cy="19" rx="4" ry="3.5" fill="var(--bg)"/>
            <ellipse cx="21" cy="19" rx="4" ry="3.5" fill="var(--bg)"/>
            <circle cx="11" cy="19" r="1.5" fill="var(--amber)"/>
            <circle cx="21" cy="19" r="1.5" fill="var(--amber)"/>
            <ellipse cx="16" cy="24" rx="2" ry="1.2" fill="var(--bg)"/>
          </svg>
          {workspaceName}
        </div>
        <div className="forum-header-sep" />
        <span className="forum-header-path">{repoPath}</span>
        <div className="forum-header-sep" />
        <span className="forum-header-channel">#forum</span>
        <div className="forum-header-status">
          <div className={`status-dot ${activeCount > 0 ? "active" : "idle"}`} />
          {statusText}
        </div>
      </div>

      {/* Body */}
      <div className="forum-body">
        <div className="forum-feed-col">
          <ForumFeed messages={messages} agents={agents} />
          <InputBar onSend={handleSend} agents={agents} />
        </div>

        <AgentRoster
          agents={agents}
          onToggleOoo={handleToggleOoo}
        />
      </div>

      <DmPanel isOpen={dmPanelOpen} onToggle={() => setDmPanelOpen((o) => !o)} />
    </div>
  );
}
