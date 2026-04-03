import React, { useState } from "react";
import type { Agent } from "../types";
import AsciiSpinner from "./AsciiSpinner";
import ProgressBar from "./ProgressBar";
import ToolBubble, { type ToolEvent } from "./ToolBubble";

export interface ActivityLine {
  type: "reading" | "editing" | "running" | "thinking" | "tool";
  description: string;
  timestamp: string;
}

interface Props {
  agent: Agent;
  activityLines: ActivityLine[];
  currentTool: ToolEvent | null;
  onClick: () => void;
}

const ACTION_COLOR: Record<string, string> = {
  reading:  "#1f521f",
  editing:  "var(--amber)",
  running:  "#ffb000",
  thinking: "#1f521f",
  tool:     "#ffb000",
};

export default function AgentActivityCard({ agent, activityLines, currentTool, onClick }: Props) {
  const nameColor = agent.avatar_color ?? "var(--amber)";
  const nameGlow = `0 0 6px ${nameColor}80`;
  const headerBg = nameColor + "26"; // 15% opacity

  const STATUS_STR: Record<string, string> = {
    idle: "[IDLE]", thinking: "[····]", acting: "[ACT·]", sleeping: "[ZZZ·]",
  };
  const statusStr = STATUS_STR[agent.status] ?? "[IDLE]";

  // Last 3 activity lines, most recent at bottom
  const last3 = activityLines.slice(-3);

  return (
    <div style={{ ...S.card, position: "relative" }} onClick={onClick}>
      <ToolBubble event={currentTool} />

      {/* Header */}
      <div style={{ ...S.header, background: headerBg }}>
        <div style={{ ...S.avatar, color: nameColor, borderColor: nameColor, textShadow: nameGlow }}>
          {(agent.name[0] ?? "?").toUpperCase()}
        </div>
        <div style={S.headerText}>
          <span style={{ ...S.agentName, color: nameColor, textShadow: nameGlow }}>
            [{agent.name.toUpperCase()}]
          </span>
          <span style={S.roleLine}>// {agent.role}</span>
        </div>
        <div style={S.headerRight}>
          <span style={S.statusStr}>{statusStr}</span>
          <AsciiSpinner state={agent.status} />
        </div>
      </div>

      {/* Activity lines */}
      <div style={S.body}>
        {last3.length === 0 ? (
          <div style={S.emptyLine}>// waiting...</div>
        ) : (
          last3.map((line, i) => {
            const isNew = i === last3.length - 1;
            const dimmed = i < last3.length - 1;
            return (
              <div key={i} style={{ ...S.actLine, opacity: dimmed ? 0.45 : 1 }}>
                <span style={S.actPrefix}>&gt;</span>
                <span style={{ color: ACTION_COLOR[line.type] ?? "var(--amber)", textShadow: isNew ? "0 0 4px rgba(51,255,0,0.3)" : "none" }}>
                  {line.type !== "tool" ? `${line.type}: ` : ""}{line.description}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Progress bar / status */}
      <div style={S.footer}>
        <ProgressBar active={agent.status === "thinking"} label="thinking..." />
        {agent.status === "acting" && agent.current_action && (
          <div style={S.actingLine}>
            <span style={S.actingLabel}>[ACT·]</span>&nbsp;
            <span style={S.actingText}>{agent.current_action}</span>
          </div>
        )}
        {(agent.status === "idle" || agent.status === "sleeping") && (
          <div style={S.idleLine}>
            {agent.status === "idle"
              ? <>[IDLE] <span className="cursor" /></>
              : "[ZZZ·]"}
          </div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #1f521f",
    marginBottom: "4px",
    cursor: "pointer",
    fontFamily: "'Geist Mono', 'Fira Code', monospace",
    transition: "border-color 0.15s",
  },
  header: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "6px 10px",
    borderBottom: "1px solid #1f521f",
  },
  avatar: {
    width: "22px", height: "22px",
    border: "1px solid",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "11px", fontWeight: 700, flexShrink: 0,
  },
  headerText: { flex: 1, display: "flex", flexDirection: "column" as const, gap: "1px", minWidth: 0 },
  agentName: { fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" },
  roleLine: { fontSize: "10px", color: "#1f521f", textShadow: "none" },
  headerRight: { display: "flex", flexDirection: "column" as const, alignItems: "flex-end", gap: "2px", flexShrink: 0 },
  statusStr: { fontSize: "10px", color: "#1f521f", textShadow: "none" },
  body: {
    padding: "6px 10px",
    display: "flex", flexDirection: "column" as const, gap: "2px",
    minHeight: "48px",
  },
  actLine: { display: "flex", gap: "6px", fontSize: "11px", lineHeight: 1.4, transition: "opacity 0.3s" },
  actPrefix: { color: "#1f521f", flexShrink: 0, textShadow: "none" },
  emptyLine: { fontSize: "11px", color: "#1f521f", textShadow: "none" },
  footer: {
    padding: "4px 10px 6px",
    borderTop: "1px solid #0f1f0f",
    minHeight: "20px",
  },
  actingLine: { display: "flex", alignItems: "center", fontSize: "11px" },
  actingLabel: { color: "var(--amber)", textShadow: "none" },
  actingText: { color: "#1f521f", textShadow: "none" },
  idleLine: { fontSize: "11px", color: "#1f521f", textShadow: "none" },
};
