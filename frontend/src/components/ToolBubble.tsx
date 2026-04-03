import React, { useEffect, useState } from "react";

export interface ToolEvent {
  tool_name: string;
  tool_input?: Record<string, unknown>;
  result_summary?: string;
  status?: "ok" | "error";
  timestamp: string;
}

interface Props {
  event: ToolEvent | null;
}

function formatInput(input: Record<string, unknown>): string[] {
  const keys = Object.keys(input).slice(0, 2);
  return keys.map((k) => {
    const v = String(input[k] ?? "").slice(0, 60);
    return `${k}: ${v}`;
  });
}

export default function ToolBubble({ event }: Props) {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!event) return;
    setVisible(true);
    setFading(false);
    const fadeTimer = setTimeout(() => setFading(true), 4000);
    const hideTimer = setTimeout(() => setVisible(false), 4500);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [event]);

  if (!visible || !event) return null;

  const inputLines = event.tool_input ? formatInput(event.tool_input) : [];
  const statusStr = event.status === "error" ? "[ERR]" : event.result_summary ? "[OK]" : "";
  const statusColor = event.status === "error" ? "var(--error)" : "var(--amber)";

  return (
    <div style={{ ...S.bubble, opacity: fading ? 0 : 1, transition: fading ? "opacity 0.5s ease" : "none" }}>
      <div style={S.line}><span style={S.key}>tool: </span><span style={S.val}>{event.tool_name}</span></div>
      {inputLines.map((line, i) => (
        <div key={i} style={S.line}><span style={S.dimLine}>{line}</span></div>
      ))}
      {event.result_summary && (
        <div style={S.line}><span style={S.key}>out: </span><span style={S.dimLine}>{event.result_summary.slice(0, 60)}</span></div>
      )}
      {statusStr && (
        <div style={S.line}><span style={{ ...S.status, color: statusColor }}>{statusStr}</span></div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  bubble: {
    position: "absolute" as const,
    bottom: "calc(100% + 6px)",
    left: 0, right: 0,
    background: "#100800",
    border: "1px solid #ffb000",
    padding: "6px 10px",
    zIndex: 10,
    fontFamily: "'Geist Mono', 'Fira Code', monospace",
    fontSize: "11px",
    pointerEvents: "none" as const,
  },
  line: { display: "flex", gap: "4px", lineHeight: 1.4 },
  key: { color: "#ffb000", flexShrink: 0, textShadow: "0 0 4px rgba(255,176,0,0.4)" },
  val: { color: "var(--amber)", textShadow: "none" },
  dimLine: { color: "#1f521f", textShadow: "none" },
  status: { fontWeight: 700 },
};
