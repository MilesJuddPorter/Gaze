import React, { useState, useEffect, useCallback } from "react";
import type { Agent } from "../types";
import AgentActivityCard, { type ActivityLine } from "./AgentActivityCard";
import AgentDeepDive from "./AgentDeepDive";
import { type ToolEvent } from "./ToolBubble";

interface Props {
  agents: Agent[];
  onStart: () => void;
  onStop: () => void;
}

// SSE event shapes
interface ToolStartEvent { agent_id: number; tool_name: string; tool_input: Record<string, unknown>; timestamp: string; }
interface AgentActivityEvent { agent_id: number; action_type: string; description: string; timestamp: string; }

export default function AgentActivityBoard({ agents, onStart, onStop }: Props) {
  // Per-agent activity lines (FIFO max 3)
  const [activityMap, setActivityMap] = useState<Record<number, ActivityLine[]>>({});
  // Per-agent current tool bubble
  const [toolMap, setToolMap] = useState<Record<number, ToolEvent | null>>({});
  // Deep dive
  const [deepDiveAgent, setDeepDiveAgent] = useState<Agent | null>(null);

  const addActivity = useCallback((agentId: number, line: ActivityLine) => {
    setActivityMap((prev) => {
      const existing = prev[agentId] ?? [];
      const updated = [...existing, line].slice(-3);
      return { ...prev, [agentId]: updated };
    });
  }, []);

  // Load initial activity from DB on mount
  useEffect(() => {
    agents.forEach(async (agent) => {
      try {
        const res = await fetch(`/api/agents/${agent.id}/activity?limit=3`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const lines: ActivityLine[] = data.reverse().map((d: { action_type: string; description: string; timestamp: string }) => ({
            type: d.action_type as ActivityLine["type"],
            description: d.description,
            timestamp: d.timestamp,
          }));
          setActivityMap((prev) => ({ ...prev, [agent.id]: lines }));
        }
      } catch { /* ignore */ }
    });
  }, [agents.map((a) => a.id).join(",")]);

  // Listen for SSE tool_start and agent_activity events
  // (Forum.tsx owns the SSE connection — we receive events via props or a shared context)
  // For now, use a separate SSE listener scoped to this board
  useEffect(() => {
    const es = new EventSource("/api/messages/stream");

    es.addEventListener("tool_start", (e) => {
      const data: ToolStartEvent = JSON.parse(e.data);
      const toolEvent: ToolEvent = {
        tool_name: data.tool_name,
        tool_input: data.tool_input,
        timestamp: data.timestamp,
      };
      setToolMap((prev) => ({ ...prev, [data.agent_id]: toolEvent }));
    });

    es.addEventListener("tool_end", (e) => {
      const data = JSON.parse(e.data);
      setToolMap((prev) => ({
        ...prev,
        [data.agent_id]: { ...prev[data.agent_id]!, result_summary: data.result_summary, status: data.status, timestamp: data.timestamp },
      }));
    });

    es.addEventListener("agent_activity", (e) => {
      const data: AgentActivityEvent = JSON.parse(e.data);
      addActivity(data.agent_id, {
        type: data.action_type as ActivityLine["type"],
        description: data.description,
        timestamp: data.timestamp,
      });
    });

    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  return (
    <div style={S.panel}>
      <div style={S.header}>
        <span style={S.title}>// ACTIVITY</span>
        <div style={S.controls}>
          <button style={S.startBtn} onClick={onStart}>[ ▶ ]</button>
          <button style={S.stopBtn} onClick={onStop}>[ ■ ]</button>
        </div>
      </div>

      <div style={S.list}>
        {agents.length === 0 && (
          <div style={S.empty}>// no agents running</div>
        )}
        {agents.map((agent) => (
          <AgentActivityCard
            key={agent.id}
            agent={agent}
            activityLines={activityMap[agent.id] ?? []}
            currentTool={toolMap[agent.id] ?? null}
            onClick={() => setDeepDiveAgent(agent)}
          />
        ))}
      </div>

      {deepDiveAgent && (
        <AgentDeepDive
          agent={deepDiveAgent}
          onClose={() => setDeepDiveAgent(null)}
        />
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  panel: {
    width: "280px",
    flexShrink: 0,
    background: "#0d0d0d",
    borderLeft: "1px solid #1f521f",
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
    fontFamily: "'JetBrains Mono', monospace",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 10px 8px",
    borderBottom: "1px solid #1f521f",
    flexShrink: 0,
  },
  title: { fontSize: "11px", color: "#1f521f", letterSpacing: "0.08em", textShadow: "none" },
  controls: { display: "flex", gap: "4px" },
  startBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    padding: "2px 6px", background: "transparent",
    border: "1px solid #33ff00", color: "#33ff00",
    fontSize: "10px", cursor: "pointer",
    textShadow: "0 0 4px rgba(51,255,0,0.4)",
  },
  stopBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    padding: "2px 6px", background: "transparent",
    border: "1px solid #ff3333", color: "#ff3333",
    fontSize: "10px", cursor: "pointer",
    textShadow: "0 0 4px rgba(255,51,51,0.3)",
  },
  list: { flex: 1, overflowY: "auto" as const, padding: "6px" },
  empty: { fontSize: "11px", color: "#1f521f", padding: "12px 4px", textShadow: "none" },
};
