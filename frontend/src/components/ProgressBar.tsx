import React, { useEffect, useState } from "react";

interface Props {
  isActive: boolean;
  label?: string;
}

export default function ProgressBar({ isActive, label = "thinking..." }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
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

      if (percent >= targetProgress) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isActive]);

  const barLength = 20;
  const filledLength = Math.floor((progress / 100) * barLength);
  const emptyLength = barLength - filledLength;

  const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);

  return (
    <div className="progress-bar my-1 font-mono text-xs">
      <div className="flex items-center gap-2">
        <span className="text-green-400">[{bar}]</span>
        <span className="text-gray-400">{label}</span>
      </div>
    </div>
  );
}
