import { useState } from "react";
import { AgentConfig } from "../types";

interface Props {
  onInit: (workspaceName: string) => void;
}

const DEFAULT_AGENT: AgentConfig = {
  name: "",
  role: "",
  system_prompt: "",
  avatar_color: "#6366f1",
  check_interval: 30,
};

const PRESET_COLORS = [
  "#6366f1", "#ec4899", "#f97316", "#22c55e",
  "#3b82f6", "#a855f7", "#14b8a6", "#ef4444",
];

export default function ConfigPanel({ onInit }: Props) {
  const [workspaceName, setWorkspaceName] = useState("My Project");
  const [agents, setAgents] = useState<AgentConfig[]>([{ ...DEFAULT_AGENT, name: "Atlas", role: "Assistant" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addAgent() {
    setAgents([...agents, { ...DEFAULT_AGENT }]);
  }

  function removeAgent(i: number) {
    setAgents(agents.filter((_, idx) => idx !== i));
  }

  function updateAgent(i: number, field: keyof AgentConfig, value: string | number) {
    const next = [...agents];
    (next[i] as any)[field] = value;
    setAgents(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = agents.every((a) => a.name.trim() && a.role.trim());
    if (!valid) {
      setError("Each agent needs a name and a role.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/config/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_name: workspaceName.trim() || "My Project",
          agents: agents.map((a) => ({
            ...a,
            name: a.name.trim(),
            role: a.role.trim(),
            system_prompt: a.system_prompt.trim() || `You are ${a.name.trim()}, a ${a.role.trim()}.`,
            check_interval: Number(a.check_interval) || 30,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Initialization failed");
      }

      onInit(workspaceName.trim() || "My Project");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
      setLoading(false);
    }
  }

  return (
    <div className="config-overlay">
      <div className="config-panel">
        <div className="config-header">
          <h1>Configure Your Agents</h1>
          <p>Set up your workspace and define the AI agents that will collaborate here.</p>
        </div>

        <form onSubmit={handleSubmit} className="config-form">
          <div className="field-group">
            <label htmlFor="workspace-name">Workspace name</label>
            <input
              id="workspace-name"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="my-project"
            />
          </div>

          <div className="agents-section">
            <div className="agents-section-header">
              <span>Agents</span>
              <button type="button" className="add-agent-btn" onClick={addAgent}>
                + Add Agent
              </button>
            </div>

            {agents.map((agent, i) => (
              <div key={i} className="agent-card">
                <div className="agent-card-header">
                  <span
                    className="agent-avatar-preview"
                    style={{ background: agent.avatar_color }}
                  >
                    {agent.name ? agent.name[0].toUpperCase() : "?"}
                  </span>
                  <span className="agent-card-title">Agent {i + 1}</span>
                  {agents.length > 1 && (
                    <button
                      type="button"
                      className="remove-agent-btn"
                      onClick={() => removeAgent(i)}
                      title="Remove agent"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="field-row">
                  <div className="field-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={agent.name}
                      onChange={(e) => updateAgent(i, "name", e.target.value)}
                      placeholder="Atlas"
                      required
                    />
                  </div>
                  <div className="field-group">
                    <label>Role</label>
                    <input
                      type="text"
                      value={agent.role}
                      onChange={(e) => updateAgent(i, "role", e.target.value)}
                      placeholder="Backend Engineer"
                      required
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>System prompt</label>
                  <textarea
                    value={agent.system_prompt}
                    onChange={(e) => updateAgent(i, "system_prompt", e.target.value)}
                    placeholder={`You are ${agent.name || "an AI agent"}, a ${agent.role || "collaborator"}. You help the team by...`}
                    rows={3}
                  />
                </div>

                <div className="field-row">
                  <div className="field-group color-field">
                    <label>Color</label>
                    <div className="color-swatches">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`color-swatch${agent.avatar_color === color ? " selected" : ""}`}
                          style={{ background: color }}
                          onClick={() => updateAgent(i, "avatar_color", color)}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="field-group interval-field">
                    <label>Check interval (sec)</label>
                    <input
                      type="number"
                      value={agent.check_interval}
                      onChange={(e) => updateAgent(i, "check_interval", parseInt(e.target.value, 10) || 30)}
                      min={5}
                      max={300}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="config-error">{error}</div>}

          <button type="submit" className="launch-btn" disabled={loading}>
            {loading ? "Launching..." : "Launch Workspace"}
          </button>
        </form>
      </div>

      <style>{`
        .config-overlay {
          min-height: 100%;
          background: var(--bg-main);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 40px 16px;
          overflow-y: auto;
        }

        .config-panel {
          width: 100%;
          max-width: 560px;
        }

        .config-header {
          margin-bottom: 28px;
        }

        .config-header h1 {
          font-size: 22px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 6px;
        }

        .config-header p {
          color: var(--text-dim);
          font-size: 13px;
        }

        .config-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }

        .field-group label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .field-group input,
        .field-group textarea {
          background: var(--bg-pane);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 8px 10px;
          color: var(--text);
          font-size: 14px;
          transition: border-color 0.15s;
        }

        .field-group input:focus,
        .field-group textarea:focus {
          border-color: #33ff00;
          outline: none;
        }

        .field-group textarea {
          resize: vertical;
          min-height: 72px;
        }

        .field-row {
          display: flex;
          gap: 12px;
        }

        .agents-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .add-agent-btn {
          font-size: 12px;
          color: #33ff00;
          padding: 4px 10px;
          border: 1px solid #33ff00;
          border-radius: 5px;
          transition: background 0.15s;
          text-transform: none;
          letter-spacing: 0;
          font-weight: 500;
        }

        .add-agent-btn:hover {
          background: rgba(99, 102, 241, 0.12);
        }

        .agents-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .agent-card {
          background: var(--bg-pane);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 10px;
        }

        .agent-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .agent-avatar-preview {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
        }

        .agent-card-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dim);
          flex: 1;
        }

        .remove-agent-btn {
          font-size: 18px;
          color: var(--text-dim);
          line-height: 1;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remove-agent-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        .color-swatches {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .color-swatch {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid transparent;
          transition: transform 0.1s, border-color 0.1s;
        }

        .color-swatch:hover {
          transform: scale(1.15);
        }

        .color-swatch.selected {
          border-color: #fff;
          transform: scale(1.15);
        }

        .interval-field {
          max-width: 140px;
        }

        .config-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 13px;
        }

        .launch-btn {
          background: #33ff00;
          color: #fff;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          transition: background 0.15s, opacity 0.15s;
          align-self: stretch;
        }

        .launch-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .launch-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
