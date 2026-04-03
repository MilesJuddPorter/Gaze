import React from "react";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  onStartAll: () => void;
  onStopAll: () => void;
  anyRunning: boolean;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    idle:     "[IDLE]",
    thinking: "[····]",
    typing:   "[····]",
    sleeping: "[ZZZ·]",
    acting:   "[ACT·]",
    error:    "[ERR·]",
  };
  return labels[status] ?? `[${status.toUpperCase().slice(0, 4)}]`;
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    idle:     "var(--text-dim)",
    thinking: "var(--amber)",
    typing:   "var(--amber)",
    sleeping: "var(--muted)",
    acting:   "var(--green)",
    error:    "var(--error)",
  };
  return colors[status] ?? "var(--text-dim)";
}

export default function AgentList({ agents, onStartAll, onStopAll, anyRunning }: Props) {
  return (
    <div style={listStyles.container}>
      <div style={listStyles.header}>
        <span style={listStyles.title}>// AGENTS</span>
        <button
          className={anyRunning ? "btn btn-danger" : "btn"}
          style={listStyles.controlBtn}
          onClick={anyRunning ? onStopAll : onStartAll}
          title={anyRunning ? "Stop all agents" : "Start all agents"}
        >
          {anyRunning ? "STOP" : "START"}
        </button>
      </div>

      <div style={listStyles.list}>
        {agents.map((agent) => (
          <div key={agent.id} style={listStyles.agentRow}>
            <div
              style={{
                ...listStyles.avatar,
                background: agent.avatar_color,
              }}
            >
              {agent.name[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={listStyles.info}>
              <div style={listStyles.name}>{agent.name.toUpperCase()}</div>
              <div style={listStyles.role}>{agent.role}</div>
            </div>
            <div style={{ ...listStyles.statusText, color: statusColor(agent.status) }}>
              {statusLabel(agent.status)}
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div style={listStyles.empty}>-- no agents --</div>
        )}
      </div>
    </div>
  );
}

const listStyles: Record<string, React.CSSProperties> = {
  container: {
    width: "200px",
    flexShrink: 0,
    borderLeft: "1px solid var(--border)",
    background: "var(--bg-pane)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 12px 10px",
    borderBottom: "1px solid var(--border)",
  },
  title: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--text-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontFamily: "var(--font)",
  },
  controlBtn: {
    fontSize: "11px",
    cursor: "pointer",
    fontFamily: "var(--font)",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "6px 0",
  },
  agentRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "7px 12px",
    cursor: "default",
    borderBottom: "1px solid var(--bg-pane)",
  },
  avatar: {
    width: "24px",
    height: "24px",
    borderRadius: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    color: "#000",
    flexShrink: 0,
    fontFamily: "var(--font)",
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontFamily: "var(--font)",
  },
  role: {
    fontSize: "10px",
    color: "var(--muted)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontFamily: "var(--font)",
  },
  statusText: {
    fontSize: "10px",
    whiteSpace: "nowrap",
    fontFamily: "var(--font)",
    flexShrink: 0,
  },
  empty: {
    padding: "16px 12px",
    fontSize: "12px",
    color: "var(--muted)",
    textAlign: "center",
    fontFamily: "var(--font)",
  },
};
