import React, { useEffect, useState } from "react";
import type { Agent } from "../types";

interface ActivityEntry {
  id: number;
  tool_name: string;
  tool_input: string;
  result_summary: string;
  status: string;
  action_type: string;
  description: string;
  timestamp: string;
}

interface Props {
  agent: Agent;
  onClose: () => void;
}

function formatTime(ts: string): string {
  const d = new Date(ts.endsWith("Z") ? ts : ts + "Z");
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export default function AgentDeepDive({ agent, onClose }: Props) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const nameColor = agent.avatar_color ?? "var(--amber)";
  const nameGlow = `0 0 6px ${nameColor}80`;

  useEffect(() => {
    fetch(`/api/agents/${agent.id}/activity?limit=20`)
      .then((r) => r.json())
      .then((data) => setActivity(Array.isArray(data) ? data : []))
      .catch(() => setActivity([]));
  }, [agent.id]);

  return (
    <div style={S.overlay}>
      <div style={S.panel}>
        {/* Header */}
        <div style={{ ...S.header, borderBottomColor: nameColor }}>
          <div style={S.headerLeft}>
            <span style={{ ...S.agentLabel, color: nameColor, textShadow: nameGlow }}>
              [{agent.name.toUpperCase()}]
            </span>
            <span style={S.role}>// {agent.role}</span>
          </div>
          <div style={S.headerRight}>
            <span style={S.statusStr}>{agent.status.toUpperCase()}</span>
            <button style={S.closeBtn} onClick={onClose}>[ CLOSE ]</button>
          </div>
        </div>

        {/* Current action */}
        {agent.current_action && (
          <div style={S.section}>
            <div style={S.sectionTitle}>CURRENT ACTION</div>
            <div style={S.divider} />
            <div style={S.currentAction}>&gt; {agent.current_action}</div>
          </div>
        )}

        {/* Tool call log */}
        <div style={S.section}>
          <div style={S.sectionTitle}>TOOL LOG (last {activity.length})</div>
          <div style={S.divider} />
          <div style={S.logList}>
            {activity.length === 0 && (
              <div style={S.emptyLog}>// no activity recorded yet</div>
            )}
            {activity.map((entry) => {
              const statusColor = entry.status === "error" ? "var(--error)" : "var(--amber)";
              return (
                <div key={entry.id} style={S.logRow}>
                  <span style={S.logTime}>{formatTime(entry.timestamp)}</span>
                  <span style={S.logTool}>{entry.tool_name.padEnd(18)}</span>
                  <span style={S.logDesc}>{entry.description.slice(0, 28).padEnd(28)}</span>
                  <span style={{ ...S.logStatus, color: statusColor }}>
                    {entry.status === "error" ? "✗" : "✓"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: "absolute" as const,
    inset: 0,
    background: "#0a0a0a",
    zIndex: 50,
    display: "flex", flexDirection: "column" as const,
    animation: "slideIn 0.2s ease",
  },
  panel: {
    flex: 1, display: "flex", flexDirection: "column" as const,
    overflow: "hidden",
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "2px solid",
    flexShrink: 0,
  },
  headerLeft: { display: "flex", flexDirection: "column" as const, gap: "2px" },
  agentLabel: { fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em" },
  role: { fontSize: "11px", color: "#1f521f", textShadow: "none" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  statusStr: { fontSize: "11px", color: "#1f521f", textShadow: "none" },
  closeBtn: {
    fontFamily: "'Inter', sans-serif",
    padding: "4px 10px", background: "transparent",
    border: "1px solid #1f521f", color: "#1f521f",
    fontSize: "11px", cursor: "pointer",
    letterSpacing: "0.05em",
  },
  section: { padding: "10px 14px", flexShrink: 0 },
  sectionTitle: { fontSize: "11px", color: "#1f521f", letterSpacing: "0.1em", textShadow: "none", marginBottom: "4px" },
  divider: { height: "1px", background: "#1f521f", marginBottom: "8px" },
  currentAction: { fontSize: "13px", color: "var(--amber)", textShadow: "none" },
  logList: { flex: 1, overflowY: "auto" as const, padding: "0 14px 14px" },
  emptyLog: { fontSize: "11px", color: "#1f521f", textShadow: "none" },
  logRow: { display: "flex", gap: "8px", fontSize: "11px", lineHeight: 1.6, borderBottom: "1px solid #0a0a0a" },
  logTime: { color: "#1f521f", flexShrink: 0, textShadow: "none" },
  logTool: { color: "#ffb000", flexShrink: 0, textShadow: "none" },
  logDesc: { color: "var(--amber)", flex: 1, textShadow: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  logStatus: { flexShrink: 0, fontWeight: 700 },
};
