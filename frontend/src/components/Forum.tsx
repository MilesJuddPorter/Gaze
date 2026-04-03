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
  const [agentsRunning, setAgentsRunning] = useState(false);
  const [dmPanelOpen, setDmPanelOpen] = useState(false);

  useEffect(() => {
    if (initialLoaded) return;
    setInitialLoaded(true);

    fetch("/api/agents")
      .then((r) => r.json())
      .then((ag: Agent[]) => {
        setAgents(ag);
        setAgentsRunning(ag.some((a) => a.running));
      })
      .catch(console.error);

    fetch("/api/agents/status/running")
      .then((r) => r.json())
      .then((d) => setAgentsRunning(d.running ?? false))
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
    setAgentsRunning(true);
    fetch("/api/agents").then((r) => r.json()).then(setAgents).catch(console.error);
  }

  async function handleStop() {
    await fetch("/api/agents/stop", { method: "POST" }).catch(console.error);
    setAgentsRunning(false);
    fetch("/api/agents").then((r) => r.json()).then(setAgents).catch(console.error);
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
        <div className="forum-header-logo">🦝 {workspaceName}</div>
        <div className="forum-header-sep" />
        <span className="forum-header-path">📁 {repoPath}</span>
        <div className="forum-header-sep" />
        <span className="forum-header-channel">#forum</span>
        <div className="forum-header-sep" />
        <span className="forum-header-status">{statusText}</span>
      </div>

      {/* Body */}
      <div className="forum-body">
        <div className="forum-feed-col">
          <ForumFeed messages={messages} agents={agents} />
          <InputBar onSend={handleSend} />
        </div>

        <AgentRoster
          agents={agents}
          agentsRunning={agentsRunning}
          onStart={handleStart}
          onStop={handleStop}
          onToggleOoo={handleToggleOoo}
        />
      </div>

      <DmPanel isOpen={dmPanelOpen} onToggle={() => setDmPanelOpen((o) => !o)} />
    </div>
  );
}
