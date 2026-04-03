import { useState, useRef } from "react";

interface Props {
  onSend: (content: string) => Promise<void>;
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
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = !!value.trim() && !sending;

  return (
    <div className="input-bar">
      <span className="input-author">You</span>
      <input
        ref={inputRef}
        className="input-field"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Send a message..."
        disabled={sending}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        className="input-send"
        onClick={handleSend}
        disabled={!canSend}
      >
        Send
      </button>
    </div>
  );
}
