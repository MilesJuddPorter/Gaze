import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import type { Agent } from "../types";

interface Props {
  onSend: (content: string) => Promise<void>;
  agents?: Agent[];
  repoPath?: string;
}

export default function InputBar({ onSend, agents = [] }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build mention list: everyone + agent names
  const allMentions = [
    { name: "everyone", role: "Wake all agents" },
    ...agents.map((a) => ({ name: a.name, role: a.role })),
  ];

  const filteredMentions = allMentions.filter((m) =>
    m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    const cursorPos = e.target.selectionStart ?? v.length;
    const textBeforeCursor = v.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionActive(true);
      setMentionIndex(0);
    } else {
      setMentionActive(false);
    }
  }

  function insertMention(name: string) {
    const input = inputRef.current;
    if (!input) return;
    const cursorPos = input.selectionStart ?? value.length;
    const textBefore = value.slice(0, cursorPos);
    const atPos = textBefore.lastIndexOf("@");
    const newValue = `${value.slice(0, atPos)}@${name} ${value.slice(cursorPos)}`;
    setValue(newValue);
    setMentionActive(false);
    setTimeout(() => {
      input.focus();
      const nc = atPos + name.length + 2;
      input.setSelectionRange(nc, nc);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mentionActive && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % filteredMentions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMentions[mentionIndex].name); return; }
      if (e.key === "Escape") { setMentionActive(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setValue("");
    setMentionActive(false);
    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="input-bar" style={{ position: "relative" }}>
      {/* @mention dropdown */}
      {mentionActive && filteredMentions.length > 0 && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: 0,
          right: 0,
          background: "var(--elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          zIndex: 100,
          marginBottom: 4,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {filteredMentions.map((m, i) => (
            <div
              key={m.name}
              onMouseDown={(e) => { e.preventDefault(); insertMention(m.name); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: i === mentionIndex ? "var(--surface)" : "transparent",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <span style={{
                width: 24, height: 24,
                borderRadius: "50%",
                background: m.name === "everyone" ? "var(--amber)" : "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600,
                color: "var(--text-primary)",
                flexShrink: 0,
              }}>
                {m.name === "everyone" ? "@" : m.name[0]?.toUpperCase()}
              </span>
              <div>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>@{m.name}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: 11 }}>{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        className="input-field"
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Send a message... (@ to mention)"
        disabled={sending}
        autoComplete="off"
        autoFocus
      />
      <button
        className="btn btn-primary"
        style={{ padding: "9px 14px", borderRadius: "var(--radius-lg)" }}
        onClick={handleSend}
        disabled={!value.trim() || sending}
      >
        <Send size={14} />
      </button>
    </div>
  );
}
