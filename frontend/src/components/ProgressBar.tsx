import React, { useEffect, useState } from "react";

interface Props {
  active: boolean;
  label?: string;
}

export default function ProgressBar({ active, label = "thinking..." }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const duration = 8000;
    const targetProgress = 90;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min((elapsed / duration) * targetProgress, targetProgress);
      setProgress(percent);
      if (percent >= targetProgress) clearInterval(interval);
    }, 50);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const barLength = 20;
  const filledLength = Math.floor((progress / 100) * barLength);
  const emptyLength = barLength - filledLength;
  const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);

  return (
    <div style={S.wrap}>
      <span style={S.bar}>[{bar}]</span>
      <span style={S.label}>{label}</span>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "11px",
  },
  bar: {
    color: "var(--amber)",
    textShadow: "none",
    letterSpacing: 0,
  },
  label: {
    color: "#1f521f",
    textShadow: "none",
  },
};
