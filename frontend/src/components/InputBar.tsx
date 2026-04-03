import { useState, useRef } from "react";

interface Props {
  onSend: (content: string) => Promise<void>;
  repoPath?: string;
}

export default function InputBar({ onSend, repoPath = "~" }: Props) {
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
      <span className="input-prompt">you@gaze:{repoPath}$</span>
      <input
        ref={inputRef}
        className="input-field"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder=""
        disabled={sending}
        autoComplete="off"
        spellCheck={false}
        autoFocus
      />
      <button
        className="btn input-send"
        onClick={handleSend}
        disabled={!value.trim() || sending}
      >
        [ SEND ]
      </button>
    </div>
  );
}
