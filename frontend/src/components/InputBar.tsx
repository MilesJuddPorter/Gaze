import { useState, useRef } from "react";
import { Send } from "lucide-react";

interface Props {
  onSend: (content: string) => Promise<void>;
  repoPath?: string;
}

export default function InputBar({ onSend }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setValue("");
    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="input-bar">
      <input
        ref={inputRef}
        className="input-field"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
        }}
        placeholder="Send a message..."
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
