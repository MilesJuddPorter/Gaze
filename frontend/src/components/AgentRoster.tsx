import { useState } from "react";
import RaccoonAvatar from "./RaccoonAvatar";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  agentsRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleOoo: (agentId: number, isOoo: boolean) => void;
}

const STATUS_LABEL: Record<string, string> = {
  idle:     "Idle",
  thinking: "Thinking",
  acting:   "Active",
  sleeping: "Idle",
};

function getAvatarClass(agent: Agent): string {
  if (!!agent.is_ooo) return "ooo";
  if (agent.status === "thinking") return "thinking";
  if (agent.status === "acting") return "active";
  if (agent.status === "sleeping") return "sleeping";
  return "";
}

function getDotClass(agent: Agent): string {
  if (!!agent.is_ooo) return "ooo";
  if (agent.status === "thinking") return "thinking";
  if (agent.status === "acting") return "active";
  return "idle";
}

export default function AgentRoster({ agents, agentsRunning, onStart, onStop, onToggleOoo }: Props) {
  const [animating, setAnimating] = useState<Set<number>>(new Set());

  const handleToggleOoo = (agent: Agent) => {
    const newOoo = !agent.is_ooo;
    if (newOoo) {
      setAnimating((prev) => new Set(prev).add(agent.id));
      setTimeout(() => {
        setAnimating((prev) => {
          const next = new Set(prev);
          next.delete(agent.id);
          return next;
        });
      }, 400);
    }
    onToggleOoo(agent.id, newOoo);
  };

  return (
    <div className="forum-roster-col">
      <div className="roster-header">
        <span className="text-subheading">Agents</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {agents.map((agent) => {
          const isOoo = !!agent.is_ooo;
          const initial = agent.name.charAt(0).toUpperCase();
          const color = agent.avatar_color || "#F59E0B";

          return (
            <div
              key={agent.id}
              className={`roster-agent${isOoo ? " ooo" : ""}`}
              style={{
                transition: "all 0.3s ease",
              }}
            >
              {/* Raccoon avatar */}
              <RaccoonAvatar
                status={isOoo ? "ooo" : agent.status}
                color={color}
                size={34}
              />

              <div className="roster-agent-info">
                <div className={`roster-agent-name${isOoo ? " ooo" : ""}`}>
                  {agent.name}
                  {isOoo && (
                    <span className="badge badge-ooo" style={{ marginLeft: 6, verticalAlign: "middle" }}>
                      OOO
                    </span>
                  )}
                </div>
                <div className="roster-agent-role">{agent.role}</div>
                <div className="roster-agent-status">
                  <div className={`status-dot ${getDotClass(agent)}`} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {isOoo ? "Unavailable" : STATUS_LABEL[agent.status] || "Idle"}
                  </span>
                </div>
              </div>

              <button
                className={`roster-ooo-btn${isOoo ? " active" : ""}`}
                onClick={() => handleToggleOoo(agent)}
                title={isOoo ? "Mark available" : "Mark as OOO"}
              >
                {isOoo ? "Available" : "OOO"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="roster-controls">
        {agentsRunning ? (
          <button className="btn btn-secondary btn-sm" onClick={onStop} style={{ flex: 1 }}>
            Stop agents
          </button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onStart} style={{ flex: 1 }}>
            Start agents
          </button>
        )}
      </div>
    </div>
  );
}
