import React, { useState, useRef, useCallback } from "react";
import type { Agent } from "../types";

interface Props {
  agents: Agent[];
  onSend: (content: string) => Promise<void>;
  repoPath?: string;
}

interface MentionSuggestion {
  name: string;
  role: string;
  avatar_color: string;
}

export default function MessageInput({ agents, onSend, repoPath = "~" }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const shortPath = repoPath.replace(/^\/Users\/[^/]+/, "~");

  const allMentions: MentionSuggestion[] = [
    { name: "everyone", role: "All agents", avatar_color: "var(--green)" },
    ...agents.map((a) => ({ name: a.name, role: a.role, avatar_color: a.avatar_color })),
  ];

  const filteredMentions = allMentions.filter((m) =>
    m.name.toLowerCase().startsWith(mentionQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  };

  const insertMention = useCallback(
    (mention: MentionSuggestion) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const cursorPos = ta.selectionStart ?? value.length;
      const textBeforeCursor = value.slice(0, cursorPos);
      const atPos = textBeforeCursor.lastIndexOf("@");
      const before = value.slice(0, atPos);
      const after = value.slice(cursorPos);
      const newValue = `${before}@${mention.name} ${after}`;
      setValue(newValue);
      setMentionActive(false);
      setTimeout(() => {
        ta.focus();
        const newCursor = atPos + mention.name.length + 2;
        ta.setSelectionRange(newCursor, newCursor);
      }, 0);
    },
    [value]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionActive && filteredMentions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % filteredMentions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + filteredMentions.length) % filteredMentions.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMentions[mentionIndex]); return; }
      if (e.key === "Escape") { setMentionActive(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const content = value.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await onSend(content);
      setValue("");
      const ta = textareaRef.current;
      if (ta) ta.style.height = "auto";
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={S.container}>
      {/* @mention autocomplete */}
      {mentionActive && filteredMentions.length > 0 && (
        <div style={S.mentionPopup}>
          {filteredMentions.map((m, i) => (
            <div
              key={m.name}
              style={{
                ...S.mentionItem,
                background: i === mentionIndex ? "var(--border)" : "transparent",
              }}
              onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
            >
              <div style={{ ...S.mentionAvatar, background: m.avatar_color, color: "#0a0a0a" }}>
                {(m.name[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <div style={S.mentionName}>@{m.name}</div>
                <div style={S.mentionRole}>{m.role}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={S.inputRow}>
        <span style={S.prompt}>you@gaze:{shortPath}$</span>
        <textarea
          ref={textareaRef}
          style={S.textarea}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="_"
          rows={1}
          disabled={sending}
          autoFocus
        />
        <button
          style={{
            ...S.sendBtn,
            opacity: !value.trim() || sending ? 0.3 : 1,
            cursor: !value.trim() || sending ? "not-allowed" : "pointer",
          }}
          onClick={handleSend}
          disabled={!value.trim() || sending}
        >
          {sending ? "[ ··· ]" : "[ SEND ]"}
        </button>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    borderTop: "1px solid var(--border)",
    background: "var(--bg)",
    padding: "10px 16px 14px",
    position: "relative",
  },
  mentionPopup: {
    position: "absolute",
    bottom: "calc(100% + 4px)",
    left: "16px",
    right: "16px",
    background: "var(--bg-pane)",
    border: "1px solid var(--border)",
    zIndex: 100,
    maxHeight: "200px",
    overflowY: "auto",
  },
  mentionItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "7px 12px",
    cursor: "pointer",
  },
  mentionAvatar: {
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "11px",
    fontWeight: 700,
    flexShrink: 0,
  },
  mentionName: {
    fontSize: "13px",
    color: "var(--green)",
    textShadow: "var(--glow)",
    fontWeight: 600,
  },
  mentionRole: {
    fontSize: "11px",
    color: "var(--muted)",
    textShadow: "none",
  },
  inputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
  },
  prompt: {
    color: "var(--muted)",
    fontSize: "13px",
    flexShrink: 0,
    paddingBottom: "3px",
    textShadow: "none",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  textarea: {
    flex: 1,
    background: "transparent",
    border: "none",
    borderBottom: "1px solid var(--border)",
    outline: "none",
    color: "var(--green)",
    fontSize: "13px",
    lineHeight: "1.5",
    resize: "none",
    maxHeight: "120px",
    overflowY: "auto",
    fontFamily: "inherit",
    padding: "2px 0",
    textShadow: "var(--glow)",
    caretColor: "var(--green)",
  },
  sendBtn: {
    background: "transparent",
    border: "1px solid var(--green)",
    color: "var(--green)",
    fontFamily: "inherit",
    fontSize: "12px",
    letterSpacing: "0.1em",
    padding: "4px 10px",
    flexShrink: 0,
    textShadow: "var(--glow)",
    transition: "background 0.1s, color 0.1s",
  },
};
