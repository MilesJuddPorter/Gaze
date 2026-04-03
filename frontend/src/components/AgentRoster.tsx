import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  onStart: () => void;
  onStop: () => void;
}

const STATUS_EMOJI: Record<string, string> = {
  idle: "🟢",
  thinking: "🟡",
  acting: "🔵",
  sleeping: "💤",
};

function AgentCard({ agent }: { agent: Agent }) {
  const statusEmoji = STATUS_EMOJI[agent.status] ?? "🟢";
  const initial = (agent.name[0] ?? "?").toUpperCase();
  const avatarBg = agent.avatar_color ?? "#33ff00";

  return (
    <div className="roster-card">
      <div
        className="roster-avatar"
        style={{ background: avatarBg, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700 }}
      >
        {initial}
      </div>
      <div className="roster-info">
        <div className="roster-name">{agent.name}</div>
        <div className="roster-role">{agent.role}</div>
        <div className="roster-action">
          {statusEmoji} {agent.current_action ?? agent.status}
        </div>
      </div>
    </div>
  );
}

export default function AgentRoster({ agents, onStart, onStop }: Props) {
  return (
    <div className="agent-roster">
      <div className="roster-header">Agents</div>

      <div className="roster-agents">
        {agents.length === 0 && (
          <div style={{ padding: "16px", color: "var(--text-dim)", fontSize: "13px" }}>
            No agents configured
          </div>
        )}
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <div className="roster-divider" />

      <div className="roster-controls">
        <button className="roster-btn" onClick={onStart}>
          ▶ Start
        </button>
        <button className="roster-btn roster-btn-stop" onClick={onStop}>
          ■ Stop
        </button>
      </div>
    </div>
  );
}
