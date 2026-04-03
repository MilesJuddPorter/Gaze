import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

interface Props {
  status: "idle" | "thinking" | "acting" | "sleeping" | "ooo" | string;
  color: string;        // agent's avatar_color — used for iris + ring
  size?: number;        // default 36
  className?: string;
}

export default function RaccoonAvatar({ status, color, size = 36, className = "" }: Props) {
  const controls = useAnimation();
  const isOoo = status === "ooo";

  // Scale factor for SVG viewBox (designed at 40px)
  const scale = size / 40;

  // Animation sequences
  useEffect(() => {
    controls.stop();

    if (isOoo) {
      controls.start({ filter: "grayscale(1) brightness(0.5)", scale: 1 });
      return;
    }

    switch (status) {
      case "idle":
      case "sleeping":
        controls.start({
          scale: [1, 1.02, 1],
          filter: status === "sleeping" ? "brightness(0.65)" : "brightness(1)",
          transition: { scale: { repeat: Infinity, duration: 3, ease: "easeInOut" } },
        });
        break;
      case "thinking":
        controls.start({
          rotate: [-0.5, 0.5, -0.5],
          filter: "brightness(1)",
          scale: 1,
          transition: { rotate: { repeat: Infinity, duration: 1.8, ease: "easeInOut" } },
        });
        break;
      case "acting":
        controls.start({
          scale: [1, 1.05, 1],
          filter: "brightness(1.1)",
          transition: { scale: { repeat: Infinity, duration: 0.9, ease: "easeInOut" } },
        });
        break;
      default:
        controls.start({ scale: 1, rotate: 0, filter: "brightness(1)" });
    }
  }, [status, isOoo, controls]);

  // Eye state
  const eyeOpen = !isOoo && status !== "sleeping";
  const eyeWide = status === "acting";

  // Pupil offset for thinking state (animated via CSS, simplified here)
  const irisY = 16.5;
  const irisRadius = eyeWide ? 3 : 2.5;

  return (
    <motion.div
      animate={controls}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        boxShadow: isOoo
          ? `0 0 0 2px #1E2330`
          : status === "thinking"
          ? `0 0 0 2px #1E2330, 0 0 0 4px #3B82F6`
          : status === "acting"
          ? `0 0 0 2px #1E2330, 0 0 0 4px ${color}`
          : `0 0 0 2px #1E2330`,
        flexShrink: 0,
        background: `${color}18`,
        transition: "box-shadow 0.3s ease",
      }}
      className={className}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        {/* ── Ears ─────────────────────────────── */}
        {/* Left ear */}
        <path d="M9 4 L5 14 L15 14 Z" fill="#E8EDF2" opacity="0.9" />
        <path d="M9 7 L7 13 L13 13 Z" fill={color} opacity="0.5" />
        {/* Right ear */}
        <path d="M31 4 L25 14 L35 14 Z" fill="#E8EDF2" opacity="0.9" />
        <path d="M31 7 L27 13 L33 13 Z" fill={color} opacity="0.5" />

        {/* ── Face ─────────────────────────────── */}
        <ellipse cx="20" cy="23" rx="13" ry="12" fill="#E8EDF2" opacity="0.95" />

        {/* ── Eye mask patches (raccoon signature) ── */}
        <ellipse cx="13.5" cy="20" rx="5.5" ry="4.5" fill="#1C2030" opacity="0.9" />
        <ellipse cx="26.5" cy="20" rx="5.5" ry="4.5" fill="#1C2030" opacity="0.9" />

        {/* ── Eyes / iris ─────────────────────── */}
        {eyeOpen ? (
          <>
            <circle cx="13.5" cy={irisY} r={irisRadius} fill={color} opacity="0.95" />
            <circle cx="26.5" cy={irisY} r={irisRadius} fill={color} opacity="0.95" />
            {/* Highlight */}
            <circle cx="14.5" cy={irisY - 0.8} r="0.8" fill="white" opacity="0.7" />
            <circle cx="27.5" cy={irisY - 0.8} r="0.8" fill="white" opacity="0.7" />
          </>
        ) : (
          /* Closed eyes (sleeping / OOO) */
          <>
            <path d="M11 16.5 Q13.5 18.5 16 16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
            <path d="M24 16.5 Q26.5 18.5 29 16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
          </>
        )}

        {/* ── Nose ─────────────────────────────── */}
        <ellipse cx="20" cy="24.5" rx="2" ry="1.3" fill="#1C2030" opacity="0.7" />

        {/* ── Subtle mouth (minimal) ─────────── */}
        <path
          d="M18.5 26.5 Q20 27.5 21.5 26.5"
          stroke="#1C2030"
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity="0.3"
        />
      </svg>
    </motion.div>
  );
}
