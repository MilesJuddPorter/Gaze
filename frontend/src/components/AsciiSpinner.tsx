import React, { useState, useEffect } from "react";

interface Props {
  state: "idle" | "thinking" | "acting" | "sleeping" | string;
}

const FRAMES: Record<string, string[]> = {
  idle:     ["█", " ", "█", " "],
  thinking: ["/", "|", "\\", "-"],
  acting:   [">", ">>", ">>>", ">>"],
  sleeping: ["z", "zz", "zzZ", "ZZZ", "ZZ", "Z"],
};

const INTERVALS: Record<string, number> = {
  idle: 500,
  thinking: 200,
  acting: 300,
  sleeping: 800,
};

export default function AsciiSpinner({ state }: Props) {
  const frames = FRAMES[state] ?? FRAMES.idle;
  const interval = INTERVALS[state] ?? 500;
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), interval);
    return () => clearInterval(t);
  }, [state, frames.length, interval]);

  const color = state === "thinking" ? "#ffb000"
    : state === "acting" ? "var(--amber)"
    : state === "sleeping" ? "#1f521f"
    : "var(--amber)";

  return (
    <span style={{
      fontFamily: "'Inter', sans-serif",
      fontSize: "13px",
      color,
      textShadow: color !== "#1f521f" ? `0 0 5px ${color}80` : "none",
      display: "inline-block",
      minWidth: "20px",
      textAlign: "center",
    }}>
      {frames[frame]}
    </span>
  );
}
