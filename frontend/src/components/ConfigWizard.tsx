import React, { useState } from "react";
import type { AgentConfig, GazeConfig } from "../types";

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    name: "Frog",
    role: "Scrum Master",
    system_prompt:
      "You are Frog, Scrum Master at a startup led by Miles (CEO). You keep the team moving, break ambiguous requests into actionable tickets, and ensure nobody is waiting on information they need. 2-4 sentences per message. No filler.",
    avatar_color: "#33ff00",
    check_interval: 5,
  },
  {
    name: "Duck",
    role: "Backend Engineer",
    system_prompt:
      "You are Duck, Backend Engineer at a startup led by Miles (CEO). You own the server, APIs, and databases. You think in systems and design APIs that won't cause problems later. 2-4 sentences per message. No filler.",
    avatar_color: "#00ffcc",
    check_interval: 5,
  },
  {
    name: "Goose",
    role: "Frontend Engineer",
    system_prompt:
      "You are Goose, Frontend Engineer at a startup led by Miles (CEO). You own the UI and the bridge between designs and APIs. Performance is a feature. Accessibility is not optional. 2-4 sentences per message. No filler.",
    avatar_color: "#ffb000",
    check_interval: 5,
  },
];

interface Props {
  onComplete: () => void;
}

interface FieldErrors {
  name?: string;
  role?: string;
  system_prompt?: string;
}

export default function ConfigWizard({ onComplete }: Props) {
  const [workspaceName, setWorkspaceName] = useState("my-workspace");
  const [agents, setAgents] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [fieldErrors, setFieldErrors] = useState<Record<number, FieldErrors>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [initLog, setInitLog] = useState<string[]>([]);
  const [enhancing, setEnhancing] = useState<Record<number, boolean>>({});

  const [generating, setGenerating] = useState(false);

  const generateFromRepo = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/agents/generate-from-repo", { method: "POST" });
      if (res.ok) {
        const { agents: suggested } = await res.json();
        if (Array.isArray(suggested) && suggested.length > 0) {
          setAgents(suggested);
        }
      }
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const enhancePrompt = async (i: number) => {
    const seed = agents[i].system_prompt.trim();
    if (!seed) return;
    setEnhancing((prev) => ({ ...prev, [i]: true }));
    try {
      const res = await fetch("/api/agents/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed,
          name: agents[i].name,
          role: agents[i].role,
        }),
      });
      if (res.ok) {
        const { prompt } = await res.json();
        updateAgent(i, { system_prompt: prompt });
      }
    } catch { /* ignore */ }
    setEnhancing((prev) => ({ ...prev, [i]: false }));
  };

  const addAgent = () => {
    setAgents([
      ...agents,
      {
        name: "",
        role: "",
        system_prompt: "",
        avatar_color: "#33ff00",
        check_interval: 30,
      },
    ]);
  };

  const removeAgent = (i: number) => {
    setAgents(agents.filter((_, idx) => idx !== i));
    const next = { ...fieldErrors };
    delete next[i];
    setFieldErrors(next);
  };

  const updateAgent = (i: number, updates: Partial<AgentConfig>) => {
    setAgents(agents.map((a, idx) => (idx === i ? { ...a, ...updates } : a)));
    // Clear error for updated field
    if (fieldErrors[i]) {
      const field = Object.keys(updates)[0] as keyof FieldErrors;
      if (fieldErrors[i][field]) {
        setFieldErrors((prev) => ({
          ...prev,
          [i]: { ...prev[i], [field]: undefined },
        }));
      }
    }
  };

  const validate = (): boolean => {
    const errors: Record<number, FieldErrors> = {};
    const names = new Set<string>();
    let valid = true;

    agents.forEach((a, i) => {
      const e: FieldErrors = {};
      if (!a.name.trim()) { e.name = "[ERR] agent requires a name"; valid = false; }
      else if (names.has(a.name.toLowerCase())) { e.name = "[ERR] duplicate agent name"; valid = false; }
      else names.add(a.name.toLowerCase());
      if (!a.role.trim()) { e.role = "[ERR] role is required"; valid = false; }
      if (!a.system_prompt.trim()) { e.system_prompt = "[ERR] system prompt is required"; valid = false; }
      if (Object.keys(e).length) errors[i] = e;
    });

    setFieldErrors(errors);
    return valid;
  };

  const handleSubmit = async () => {
    if (agents.length === 0) {
      setFormError("[ERR] at least one agent is required to launch");
      return;
    }
    if (!validate()) {
      setFormError("[ERR] fix highlighted fields before launching");
      return;
    }

    setFormError("");
    setSubmitting(true);

    const steps = [
      "reading config...",
      "creating .gaze/",
      "writing config.json",
      "initializing database",
      "starting agent loops",
    ];

    // Typewriter init sequence
    for (let i = 0; i < steps.length; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setInitLog((prev) => [...prev, steps[i]]);
    }

    try {
      const config: GazeConfig = { workspace_name: workspaceName, agents };
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "failed to save config");
      }
      // Verify agents actually started
      await new Promise((r) => setTimeout(r, 500));
      const agentsRes = await fetch("/api/agents");
      const agentsData = await agentsRes.json();
      const runningCount = Array.isArray(agentsData)
        ? agentsData.filter((a: { running?: boolean }) => a.running).length
        : 0;

      if (runningCount === 0) {
        setInitLog((prev) => [
          ...prev,
          "[ERR] no agents started — check ANTHROPIC_API_KEY",
          "> export ANTHROPIC_API_KEY=sk-... and relaunch",
        ]);
        setSubmitting(false);
        return;
      }

      setInitLog((prev) => [...prev, `[OK] ${runningCount} agent${runningCount > 1 ? "s" : ""} online`]);
      await new Promise((r) => setTimeout(r, 300));
      setInitLog((prev) => [...prev, "[OK] workspace ready"]);
      await new Promise((r) => setTimeout(r, 600));
      onComplete();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown error";
      setInitLog((prev) => [...prev, `[ERR] init failed: ${msg}`]);
      setSubmitting(false);
    }
  };

  // Init sequence screen
  if (submitting && initLog.length > 0) {
    return (
      <div style={S.screen}>
        <div style={S.initBox}>
          <div style={S.initTitle}>INITIALIZING GAZE</div>
          <div style={S.initDivider}>{'═'.repeat(40)}</div>
          {initLog.map((line, i) => (
            <div
              key={i}
              style={{
                ...S.initLine,
                color: line.startsWith("[OK]")
                  ? "var(--green)"
                  : line.startsWith("[ERR]")
                  ? "var(--error)"
                  : "var(--text-dim)",
              }}
            >
              {">"} {line}
            </div>
          ))}
          {initLog[initLog.length - 1] !== "[OK] workspace ready" &&
            !initLog[initLog.length - 1]?.startsWith("[ERR]") && (
              <span className="cursor" style={{ marginLeft: 8 }} />
            )}
        </div>
      </div>
    );
  }

  return (
    <div style={S.screen}>
      <div style={S.container}>
        {/* ASCII Header */}
        <div style={S.logo}>
          <pre style={S.ascii}>{`
  ___   _   ____________
 / _ \\ / | / /_  __/ __ \\
/ /_\\ \\/  |/ / / / / / / /
\\_, //_/|_/ /_/ /_/ /_/
/_/
`}</pre>
          <div style={S.subtitle}>
            {"// WORKSPACE INIT  //  NO .GAZE FOUND"}
          </div>
        </div>

        <div style={S.divider}>{'═'.repeat(50)}</div>

        {/* AI Generate from Repo */}
        <div style={S.generateRow}>
          <span style={S.generateHint}>// auto-detect agents from this repo:</span>
          <button
            style={{
              ...S.generateBtn,
              opacity: generating ? 0.5 : 1,
              cursor: generating ? "not-allowed" : "pointer",
            }}
            onClick={generateFromRepo}
            disabled={generating}
          >
            {generating ? "[ analyzing repo... ]" : "[ ✦ GENERATE AGENTS FROM REPO ]"}
          </button>
        </div>

        {/* Workspace Name */}
        <div style={S.section}>
          <div style={S.sectionLabel}>{"// WORKSPACE"}</div>
          <div className="field-group">
            <span className="field-prompt">{"name >"}</span>
            <input
              className="field-input"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="my-workspace"
            />
          </div>
        </div>

        <div style={S.divider}>{'─'.repeat(50)}</div>

        {/* Agents */}
        <div style={S.section}>
          <div style={S.sectionLabel}>{"// AGENTS"}</div>

          {agents.length === 0 && (
            <div style={S.emptyPane}>
              <div style={S.emptyPlus}>+</div>
              <div style={S.emptyLabel}>ADD FIRST AGENT</div>
              <div style={S.emptyHint}>at least one agent required to proceed</div>
            </div>
          )}

          {agents.map((agent, i) => (
            <div
              key={i}
              style={{
                ...S.agentPane,
                borderColor: fieldErrors[i] ? "var(--error)" : "var(--border)",
              }}
            >
              <div style={S.agentPaneHeader}>
                <span
                  style={{
                    ...S.agentAvatar,
                    background: agent.avatar_color,
                    color: "#0a0a0a",
                  }}
                >
                  {(agent.name[0] ?? "?").toUpperCase()}
                </span>
                <span style={S.agentPaneTitle}>
                  AGENT_{String(i + 1).padStart(3, "0")}
                  {agent.name ? `  //  ${agent.name.toUpperCase()}` : ""}
                </span>
                <button style={S.removeBtn} onClick={() => removeAgent(i)}>
                  [✕]
                </button>
              </div>

              <div style={S.agentForm}>
                <div className="field-group">
                  <span className="field-prompt">{"name    >"}</span>
                  <input
                    className="field-input"
                    value={agent.name}
                    onChange={(e) => updateAgent(i, { name: e.target.value })}
                    placeholder="atlas"
                  />
                </div>
                {fieldErrors[i]?.name && (
                  <div style={S.fieldErr}>{fieldErrors[i].name}</div>
                )}

                <div className="field-group">
                  <span className="field-prompt">{"role    >"}</span>
                  <input
                    className="field-input"
                    value={agent.role}
                    onChange={(e) => updateAgent(i, { role: e.target.value })}
                    placeholder="backend engineer"
                  />
                </div>
                {fieldErrors[i]?.role && (
                  <div style={S.fieldErr}>{fieldErrors[i].role}</div>
                )}

                <div style={S.promptSection}>
                  <div style={S.promptHeader}>
                    <div style={S.promptLabel}>{"// SYSTEM PROMPT"}</div>
                    <button
                      style={{
                        ...S.enhanceBtn,
                        opacity: enhancing[i] || !agent.system_prompt.trim() ? 0.4 : 1,
                        cursor: enhancing[i] || !agent.system_prompt.trim() ? "not-allowed" : "pointer",
                      }}
                      onClick={() => enhancePrompt(i)}
                      disabled={enhancing[i] || !agent.system_prompt.trim()}
                      title="AI-enhance this prompt"
                    >
                      {enhancing[i] ? "[ enhancing... ]" : "[ ✦ ENHANCE ]"}
                    </button>
                  </div>
                  <textarea
                    style={S.promptTextarea}
                    value={agent.system_prompt}
                    onChange={(e) => updateAgent(i, { system_prompt: e.target.value })}
                    placeholder={"You are Atlas, a backend engineer..."}
                    rows={3}
                  />
                  {fieldErrors[i]?.system_prompt && (
                    <div style={S.fieldErr}>{fieldErrors[i].system_prompt}</div>
                  )}
                </div>

                <div style={S.inlineRow}>
                  <div className="field-group" style={{ flex: 1 }}>
                    <span className="field-prompt">{"color   >"}</span>
                    <input
                      type="color"
                      style={S.colorPicker}
                      value={agent.avatar_color}
                      onChange={(e) => updateAgent(i, { avatar_color: e.target.value })}
                    />
                    <span style={S.colorHex}>{agent.avatar_color}</span>
                  </div>
                  <div className="field-group" style={{ width: 140 }}>
                    <span className="field-prompt">{"interval>"}</span>
                    <input
                      className="field-input"
                      type="number"
                      min={1}
                      value={agent.check_interval}
                      onChange={(e) =>
                        updateAgent(i, { check_interval: parseInt(e.target.value) || 30 })
                      }
                      style={{ width: 48 }}
                    />
                    <span style={S.unit}>s</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button style={S.addBtn} onClick={addAgent}>
            + ADD AGENT
          </button>
        </div>

        <div style={S.divider}>{'═'.repeat(50)}</div>

        {formError && (
          <div style={S.formError}>{formError}</div>
        )}

        <button
          style={{
            ...S.launchBtn,
            opacity: agents.length === 0 ? 0.35 : 1,
            cursor: agents.length === 0 ? "not-allowed" : "pointer",
          }}
          onClick={handleSubmit}
          disabled={agents.length === 0}
          title={agents.length === 0 ? "// add at least one agent to continue" : undefined}
        >
          LAUNCH WORKSPACE
        </button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  screen: {
    height: "100%",
    background: "var(--bg)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    overflowY: "auto",
    padding: "48px 24px",
  },
  container: {
    width: "100%",
    maxWidth: "640px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  logo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  ascii: {
    fontFamily: "'JetBrains Mono', monospace",
    color: "var(--green)",
    textShadow: "var(--glow-strong)",
    fontSize: "13px",
    lineHeight: 1.2,
    margin: 0,
  },
  subtitle: {
    color: "var(--muted)",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textShadow: "none",
  },
  divider: {
    color: "var(--muted)",
    fontSize: "12px",
    textShadow: "none",
    letterSpacing: 0,
    userSelect: "none",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  sectionLabel: {
    color: "var(--muted)",
    fontSize: "12px",
    letterSpacing: "0.1em",
    textShadow: "none",
  },
  emptyPane: {
    border: "1px dashed var(--muted)",
    background: "var(--bg-pane)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  },
  emptyPlus: {
    color: "var(--muted)",
    fontSize: "24px",
    textShadow: "none",
  },
  emptyLabel: {
    color: "var(--muted)",
    fontSize: "13px",
    letterSpacing: "0.1em",
    textShadow: "none",
  },
  emptyHint: {
    color: "var(--text-dim)",
    fontSize: "12px",
    textShadow: "none",
  },
  agentPane: {
    border: "1px solid var(--border)",
    background: "var(--bg-pane)",
  },
  agentPaneHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 12px",
    background: "var(--border)",
  },
  agentAvatar: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0,
  },
  agentPaneTitle: {
    flex: 1,
    fontSize: "12px",
    color: "#0a0a0a",
    letterSpacing: "0.08em",
    fontWeight: 700,
    textShadow: "none",
  },
  removeBtn: {
    background: "transparent",
    border: "none",
    color: "#0a0a0a",
    fontSize: "12px",
    cursor: "pointer",
    opacity: 0.7,
    textShadow: "none",
  },
  agentForm: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  fieldErr: {
    color: "var(--error)",
    fontSize: "11px",
    paddingLeft: "8px",
    textShadow: "var(--glow-error)",
    marginTop: "2px",
  },
  promptSection: {
    marginTop: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  promptHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promptLabel: {
    color: "var(--muted)",
    fontSize: "11px",
    textShadow: "none",
  },
  enhanceBtn: {
    background: "transparent",
    border: "1px solid var(--amber)",
    color: "var(--amber)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    letterSpacing: "0.08em",
    padding: "2px 8px",
    textShadow: "none",
    transition: "background 0.1s, color 0.1s",
  },
  promptTextarea: {
    background: "transparent",
    border: "none",
    borderTop: "1px dashed var(--border)",
    borderBottom: "1px dashed var(--border)",
    outline: "none",
    color: "var(--green)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    textShadow: "var(--glow)",
    width: "100%",
    minHeight: "60px",
    resize: "vertical",
    padding: "8px 0",
    caretColor: "var(--green)",
    lineHeight: 1.5,
  },
  inlineRow: {
    display: "flex",
    gap: "16px",
    marginTop: "4px",
  },
  colorPicker: {
    width: "24px",
    height: "18px",
    padding: "1px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    flexShrink: 0,
  },
  colorHex: {
    color: "var(--text-dim)",
    fontSize: "12px",
    textShadow: "none",
  },
  unit: {
    color: "var(--muted)",
    fontSize: "12px",
    textShadow: "none",
  },
  addBtn: {
    background: "transparent",
    border: "1px dashed var(--muted)",
    color: "var(--muted)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.1em",
    padding: "8px",
    cursor: "pointer",
    textShadow: "none",
    transition: "border-color 0.1s, color 0.1s",
    width: "100%",
  },
  formError: {
    color: "var(--error)",
    fontSize: "12px",
    textShadow: "var(--glow-error)",
    borderLeft: "3px solid var(--error)",
    paddingLeft: "10px",
    background: "#150505",
    padding: "8px 12px",
  },
  launchBtn: {
    background: "transparent",
    border: "1px solid var(--green)",
    color: "var(--green)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "13px",
    letterSpacing: "0.15em",
    padding: "10px",
    textShadow: "var(--glow)",
    width: "100%",
    textAlign: "center" as const,
    transition: "background 0.1s, color 0.1s",
  },
  generateRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap" as const,
  },
  generateHint: {
    color: "var(--muted)",
    fontSize: "12px",
    textShadow: "none",
  },
  generateBtn: {
    background: "transparent",
    border: "1px solid var(--green)",
    color: "var(--green)",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12px",
    letterSpacing: "0.08em",
    padding: "5px 12px",
    textShadow: "var(--glow)",
    transition: "background 0.1s, color 0.1s",
  },
  // Init sequence
  initBox: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    maxWidth: "500px",
    width: "100%",
  },
  initTitle: {
    color: "var(--green)",
    fontSize: "16px",
    letterSpacing: "0.2em",
    textShadow: "var(--glow-strong)",
    marginBottom: "4px",
  },
  initDivider: {
    color: "var(--muted)",
    fontSize: "12px",
    textShadow: "none",
    marginBottom: "8px",
    userSelect: "none",
  },
  initLine: {
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', monospace",
    textShadow: "none",
  },
};
