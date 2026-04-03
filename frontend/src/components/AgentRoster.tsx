import { useState, useEffect } from "react";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  agentsRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  thinkingAgentIds?: number[];
}

const STATUS_CLASS: Record<string, string> = {
  idle:     "roster-status-idle",
  thinking: "roster-status-think",
  acting:   "roster-status-act",
  sleeping: "roster-status-sleep",
};

const STATUS_STR: Record<string, string> = {
  idle:     "[IDLE]",
  thinking: "[····]",
  acting:   "[ACT·]",
  sleeping: "[ZZZ]",
};

export default function AgentRoster({ agents, agentsRunning, onStart, onStop, thinkingAgentIds = [] }: Props) {
  return (
    <div className="forum-roster-col">
      <div className="roster-header">+--- AGENTS ---+</div>

      {agents.map((agent) => {
        const color = agent.avatar_color || "#33ff00";
        const glow = `0 0 5px ${color}80`;
        const statusKey = agent.status || "idle";
        const statusClass = STATUS_CLASS[statusKey] || "roster-status-idle";
        const statusStr = STATUS_STR[statusKey] || "[----]";
        const isThinking = thinkingAgentIds.includes(agent.id);

        return (
          <div key={agent.id} className="roster-agent">
            <div className="roster-agent-name">
              <span
                className="agent-avatar"
                style={{ background: color, border: `1px solid ${color}` }}
              >
                {agent.name.charAt(0).toUpperCase()}
              </span>
              <span style={{ color, textShadow: glow }}>
                {agent.name.toUpperCase()}
              </span>
            </div>
            <div className="roster-agent-role">role: {agent.role.toLowerCase()}</div>
            <div className={`roster-status ${statusClass}`}>
              status: {statusStr}
            </div>
            {isThinking && (
              <div className="msg-thinking">
                {agent.name.toLowerCase()} is thinking█
              </div>
            )}
            {agent.current_action && !isThinking && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--muted)", textShadow: "none" }}>
                {agent.current_action}
              </div>
            )}
          </div>
        );
      })}

      <div className="roster-controls">
        {agentsRunning ? (
          <button className="btn btn-sm btn-danger" onClick={onStop}>
            [ STOP ]
          </button>
        ) : (
          <button className="btn btn-sm" onClick={onStart}>
            [ START ]
          </button>
        )}
      </div>
    </div>
  );
}
