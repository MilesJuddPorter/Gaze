import React, { useState, useEffect, useCallback } from "react";
import type { Agent } from "../types";
import AgentActivityCard, { type ActivityLine } from "./AgentActivityCard";
import AgentDeepDive from "./AgentDeepDive";
import { type ToolEvent } from "./ToolBubble";
import { useGazeSSE } from "../context/GazeSSE";

interface Props {
  agents: Agent[];
  onStart: () => void;
  onStop: () => void;
}

export default function AgentActivityBoard({ agents, onStart, onStop }: Props) {
  // Subscribe to the shared SSE context — no second EventSource opened here
  const { onToolStart, onToolEnd, onAgentActivity } = useGazeSSE();

  const [activityMap, setActivityMap] = useState<Record<number, ActivityLine[]>>({});
  const [toolMap, setToolMap] = useState<Record<number, ToolEvent | null>>({});
  const [deepDiveAgent, setDeepDiveAgent] = useState<Agent | null>(null);

  const addActivity = useCallback((agentId: number, line: ActivityLine) => {
    setActivityMap((prev) => {
      const existing = prev[agentId] ?? [];
      const updated = [...existing, line].slice(-3); // FIFO max 3
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
          const lines: ActivityLine[] = data.reverse().map(
            (d: { action_type: string; description: string; timestamp: string }) => ({
              type: d.action_type as ActivityLine["type"],
              description: d.description,
              timestamp: d.timestamp,
            })
          );
          setActivityMap((prev) => ({ ...prev, [agent.id]: lines }));
        }
      } catch { /* ignore */ }
    });
  }, [agents.map((a) => a.id).join(",")]);

  // Subscribe to shared SSE events (no new connection opened)
  useEffect(() => {
    const unsubStart = onToolStart((data) => {
      setToolMap((prev) => ({
        ...prev,
        [data.agent_id]: {
          tool_name: data.tool_name,
          tool_input: data.tool_input,
          timestamp: data.timestamp,
        },
      }));
    });

    const unsubEnd = onToolEnd((data) => {
      setToolMap((prev) => ({
        ...prev,
        [data.agent_id]: prev[data.agent_id]
          ? { ...prev[data.agent_id]!, result_summary: data.result_summary, status: data.status, timestamp: data.timestamp }
          : null,
      }));
    });

    const unsubActivity = onAgentActivity((data) => {
      addActivity(data.agent_id, {
        type: data.action_type as ActivityLine["type"],
        description: data.description,
        timestamp: data.timestamp,
      });
    });

    return () => {
      unsubStart();
      unsubEnd();
      unsubActivity();
    };
  }, [onToolStart, onToolEnd, onAgentActivity, addActivity]);

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
    fontFamily: "'Inter', sans-serif",
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
    fontFamily: "'Inter', sans-serif",
    padding: "2px 6px", background: "transparent",
    border: "1px solid var(--amber)", color: "var(--amber)",
    fontSize: "10px", cursor: "pointer",
    textShadow: "none",
  },
  stopBtn: {
    fontFamily: "'Inter', sans-serif",
    padding: "2px 6px", background: "transparent",
    border: "1px solid var(--error)", color: "var(--error)",
    fontSize: "10px", cursor: "pointer",
    textShadow: "0 0 4px rgba(255,51,51,0.3)",
  },
  list: { flex: 1, overflowY: "auto" as const, padding: "6px" },
  empty: { fontSize: "11px", color: "#1f521f", padding: "12px 4px", textShadow: "none" },
};
