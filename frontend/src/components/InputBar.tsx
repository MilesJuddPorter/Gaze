import { useState, useRef } from "react";

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="input-bar">
      <span className="input-raccoon">🦝</span>
      <input
        ref={inputRef}
        className="input-field"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Post to #forum..."
        disabled={sending}
        autoComplete="off"
        autoFocus
      />
      <button
        className="btn btn-primary input-send"
        onClick={handleSend}
        disabled={!value.trim() || sending}
      >
        {sending ? "..." : "Send"}
      </button>
    </div>
  );
}
