import { useState } from "react";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  agentsRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleOoo: (agentId: number, isOoo: boolean) => void;
}

const STATUS_DISPLAY: Record<string, string> = {
  idle:     "🌙 resting",
  thinking: "💭 thinking...",
  acting:   "⚡ working",
  sleeping: "💤 sleeping",
};

function getAvatarClass(agent: Agent): string {
  if (!!agent.is_ooo) return "ooo";
  if (agent.status === "thinking") return "thinking";
  if (agent.status === "acting") return "active";
  if (agent.status === "sleeping") return "sleeping";
  return "active";
}

export default function AgentRoster({ agents, agentsRunning, onStart, onStop, onToggleOoo }: Props) {
  const [divingIds, setDivingIds] = useState<Set<number>>(new Set());

  const handleToggleOoo = (agent: Agent) => {
    const newOoo = !agent.is_ooo;
    if (newOoo) {
      // Trigger dive animation
      setDivingIds((prev) => new Set(prev).add(agent.id));
      setTimeout(() => {
        setDivingIds((prev) => {
          const next = new Set(prev);
          next.delete(agent.id);
          return next;
        });
      }, 500);
    }
    onToggleOoo(agent.id, newOoo);
  };

  return (
    <div className="forum-roster-col">
      <div className="roster-header">🌙 The Den</div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {agents.map((agent) => {
          const isOoo = !!agent.is_ooo;
          const isDiving = divingIds.has(agent.id);
          const statusLabel = isOoo
            ? "🗑️ out of den"
            : STATUS_DISPLAY[agent.status] || "🌙 resting";

          return (
            <div
              key={agent.id}
              className={`roster-agent${isOoo ? " ooo" : ""}`}
            >
              <div className="roster-agent-header">
                {/* Avatar with state */}
                <div
                  className={`avatar avatar-size-sm ${getAvatarClass(agent)}`}
                  style={{
                    animation: isDiving ? "ooo-dive 0.5s ease" : undefined,
                  }}
                >
                  {isOoo ? "🗑️" : "🦝"}
                </div>

                {/* Name */}
                <span className={`roster-agent-name${isOoo ? " ooo" : ""}`}>
                  {agent.name}
                </span>

                {/* OOO Toggle */}
                <button
                  className={`roster-ooo-btn${isOoo ? " active" : ""}`}
                  onClick={() => handleToggleOoo(agent)}
                  title={isOoo ? "Back in den" : "Mark OOO"}
                >
                  {isOoo ? "Back" : "OOO"}
                </button>
              </div>

              <div className="roster-agent-role">{agent.role}</div>

              <div style={{ paddingLeft: "46px" }}>
                <span
                  className={`status-badge ${
                    isOoo ? "status-ooo" :
                    agent.status === "thinking" ? "status-think" :
                    agent.status === "acting" ? "status-act" :
                    agent.status === "sleeping" ? "status-sleep" : "status-idle"
                  }`}
                >
                  {statusLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="roster-controls">
        {agentsRunning ? (
          <button className="btn btn-secondary btn-sm" onClick={onStop} style={{ flex: 1 }}>
            ⏹ Stop
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onStart} style={{ flex: 1 }}>
            ▶ Start
          </button>
        )}
      </div>
    </div>
  );
}
