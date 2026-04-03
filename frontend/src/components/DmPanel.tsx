import React, { useState, useEffect, useRef } from "react";
import { useGazeSSE } from "../context/GazeSSE";

interface DmAgent {
  id: number;
  name: string;
  avatar_color: string;
}

interface DmMessage {
  id: number;
  sender_name: string;
  sender_id: number | null;
  content: string;
  timestamp: string;
  channel_id?: number;
}

interface DmThread {
  id: number;
  name: string;
  agent1: DmAgent | null;
  agent2: DmAgent | null;
  last_message: DmMessage | null;
}

interface Props {
  isOpen: boolean;
  onToggle: () => void;
}

export default function DmPanel({ isOpen, onToggle }: Props) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [activeThread, setActiveThread] = useState<DmThread | null>(null);
  const [threadMessages, setThreadMessages] = useState<DmMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const feedRef = useRef<HTMLDivElement>(null);

  // Subscribe to dm_message events from shared SSE context
  const { onDmMessage } = useGazeSSE();

  // Fetch threads on open
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/dms")
      .then((r) => r.json())
      .then((data: DmThread[]) => setThreads(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [isOpen]);

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeThread) return;
    fetch(`/api/dms/${activeThread.id}/messages?limit=50`)
      .then((r) => r.json())
      .then((msgs: DmMessage[]) => {
        setThreadMessages(Array.isArray(msgs) ? msgs : []);
        // Clear unread for this thread
        setUnreadCounts((prev) => ({ ...prev, [activeThread.id]: 0 }));
      })
      .catch(console.error);
  }, [activeThread?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [threadMessages]);

  // Wire onDmMessage SSE events for real-time DM updates
  useEffect(() => {
    const unsub = onDmMessage((event) => {
      const { channel_id, content, sender_name, timestamp } = event as Record<string, unknown>;
      const channelId = channel_id as number;
      // If this DM is for the active thread, append it
      if (activeThread?.id === channelId) {
        const newMsg: DmMessage = {
          id: Date.now(),
          content: content as string,
          sender_name: (sender_name as string) ?? "agent",
          sender_id: null,
          timestamp: (timestamp as string) ?? new Date().toISOString(),
        };
        setThreadMessages((prev) => [...prev, newMsg]);
        setUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));
      } else {
        // Increment unread for background threads
        setUnreadCounts((prev) => ({ ...prev, [channelId]: (prev[channelId] ?? 0) + 1 }));
      }
      // Refresh thread list to update last_message preview
      fetch("/api/dms")
        .then((r) => r.json())
        .then((data: DmThread[]) => { if (Array.isArray(data)) setThreads(data); })
        .catch(console.error);
    });
    return unsub;
  }, [onDmMessage, activeThread?.id]);

  // Poll for new DM threads and messages (fallback — SSE handles live updates)
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      fetch("/api/dms")
        .then((r) => r.json())
        .then((data: DmThread[]) => {
          if (!Array.isArray(data)) return;
          // Check for new messages on active thread
          if (activeThread) {
            const updated = data.find((t) => t.id === activeThread.id);
            const lastId = threadMessages[threadMessages.length - 1]?.id ?? 0;
            if (updated?.last_message && updated.last_message.id > lastId) {
              fetch(`/api/dms/${activeThread.id}/messages?limit=50`)
                .then((r) => r.json())
                .then((msgs: DmMessage[]) => setThreadMessages(Array.isArray(msgs) ? msgs : []))
                .catch(console.error);
            }
          }
          // Update unread counts for inactive threads
          setThreads(data);
        })
        .catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, activeThread, threadMessages]);

  async function handleSend() {
    if (!activeThread || !inputValue.trim() || sending) return;
    setSending(true);
    const content = inputValue.trim();
    setInputValue("");
    try {
      const res = await fetch(`/api/dms/${activeThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setThreadMessages((prev) => [...prev, msg as DmMessage]);
      }
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour12: false, hour: "2-digit", minute: "2-digit",
    });
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={S.panel}>
      {/* Panel header / toggle */}
      <button style={S.toggle} onClick={onToggle}>
        <span style={S.toggleLabel}>DM THREADS</span>
        {totalUnread > 0 && (
          <span style={S.unreadBadge}>{totalUnread}</span>
        )}
        <span style={S.toggleArrow}>{isOpen ? "▾" : "▸"}</span>
      </button>

      {isOpen && (
        <div style={S.body}>
          {/* Thread list — left side when thread is open, full width otherwise */}
          <div style={activeThread ? S.threadListNarrow : S.threadListFull}>
            {threads.length === 0 ? (
              <div style={S.empty}>// no DM threads yet</div>
            ) : (
              threads.map((thread) => {
                const a1 = thread.agent1;
                const a2 = thread.agent2;
                const isActive = activeThread?.id === thread.id;
                return (
                  <div
                    key={thread.id}
                    style={{
                      ...S.threadRow,
                      background: isActive ? "rgba(51,255,0,0.06)" : "transparent",
                      borderLeft: isActive ? "2px solid var(--amber)" : "2px solid transparent",
                    }}
                    onClick={() => setActiveThread(isActive ? null : thread)}
                  >
                    {/* Agent avatars */}
                    <div style={S.avatarPair}>
                      {a1 && (
                        <div style={{ ...S.avatar, background: a1.avatar_color }}>
                          {a1.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {a2 && (
                        <div style={{ ...S.avatar, background: a2.avatar_color, marginLeft: -6 }}>
                          {a2.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div style={S.threadInfo}>
                      <div style={S.threadNames}>
                        {a1?.name ?? "?"} ↔ {a2?.name ?? "?"}
                      </div>
                      {thread.last_message && (
                        <div style={S.lastMessage}>
                          {thread.last_message.content.slice(0, 38)}
                          {thread.last_message.content.length > 38 ? "…" : ""}
                        </div>
                      )}
                    </div>

                    {unreadCounts[thread.id] > 0 && (
                      <span style={S.threadUnread}>{unreadCounts[thread.id]}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Thread messages view */}
          {activeThread && (
            <div style={S.threadView}>
              <div style={S.threadHeader}>
                <span style={S.threadHeaderNames}>
                  {activeThread.agent1?.name ?? "?"} ↔ {activeThread.agent2?.name ?? "?"}
                </span>
                <button style={S.closeThread} onClick={() => setActiveThread(null)}>✕</button>
              </div>

              <div ref={feedRef} style={S.messages}>
                {threadMessages.length === 0 ? (
                  <div style={S.empty}>// no messages yet</div>
                ) : (
                  threadMessages.map((msg) => {
                    const isHuman = !msg.sender_id;
                    const agent = !isHuman
                      ? (activeThread.agent1?.id === msg.sender_id
                          ? activeThread.agent1
                          : activeThread.agent2)
                      : null;
                    const color = agent?.avatar_color ?? "var(--amber)";
                    return (
                      <div key={msg.id} style={S.msgRow}>
                        {isHuman ? (
                          <div style={S.humanMsg}>
                            <span style={S.msgPrompt}>you$ </span>
                            {msg.content}
                          </div>
                        ) : (
                          <div style={S.agentMsg}>
                            <span style={{ ...S.msgName, color }}>
                              [{msg.sender_name.toUpperCase()}]
                            </span>
                            <span style={S.msgTime}>{formatTime(msg.timestamp)}</span>
                            <div style={S.msgContent}>{">"} {msg.content}</div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Human input */}
              <div style={S.inputRow}>
                <span style={S.inputPrompt}>you$</span>
                <input
                  style={S.inputField}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder=""
                  disabled={sending}
                  autoFocus
                />
                <button
                  style={{ ...S.sendBtn, opacity: inputValue.trim() && !sending ? 1 : 0.4 }}
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                >
                  [ SEND ]
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  panel: {
    borderTop: "1px solid var(--border)",
    background: "var(--bg-pane)",
    flexShrink: 0,
  },
  toggle: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  toggleLabel: {
    fontSize: "11px",
    color: "var(--muted)",
    letterSpacing: "0.1em",
    textShadow: "none",
  },
  toggleArrow: {
    fontSize: "11px",
    color: "var(--muted)",
    textShadow: "none",
    marginLeft: "auto",
  },
  unreadBadge: {
    background: "var(--amber)",
    color: "#0a0a0a",
    fontSize: "9px",
    fontWeight: 700,
    padding: "1px 5px",
    textShadow: "none",
  },
  body: {
    display: "flex",
    borderTop: "1px solid var(--border)",
    maxHeight: "320px",
  },
  threadListFull: {
    flex: 1,
    overflowY: "auto" as const,
  },
  threadListNarrow: {
    width: "160px",
    flexShrink: 0,
    borderRight: "1px solid var(--border)",
    overflowY: "auto" as const,
  },
  threadRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    cursor: "pointer",
    transition: "background 0.1s",
    borderBottom: "1px solid var(--border)",
  },
  avatarPair: {
    display: "flex",
    flexShrink: 0,
  },
  avatar: {
    width: "20px",
    height: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 700,
    color: "#0a0a0a",
    flexShrink: 0,
  },
  threadInfo: {
    flex: 1,
    minWidth: 0,
  },
  threadNames: {
    fontSize: "11px",
    color: "var(--amber)",
    textShadow: "none",
    fontWeight: 700,
    letterSpacing: "0.04em",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  lastMessage: {
    fontSize: "10px",
    color: "var(--muted)",
    textShadow: "none",
    marginTop: "2px",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  threadUnread: {
    background: "var(--amber)",
    color: "#0a0a0a",
    fontSize: "9px",
    fontWeight: 700,
    padding: "1px 4px",
    textShadow: "none",
    flexShrink: 0,
  },
  threadView: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  threadHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 10px",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  },
  threadHeaderNames: {
    fontSize: "11px",
    color: "var(--amber)",
    textShadow: "var(--glow)",
    letterSpacing: "0.06em",
  },
  closeThread: {
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    cursor: "pointer",
    fontSize: "12px",
    textShadow: "none",
  },
  messages: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  msgRow: {},
  humanMsg: {
    fontSize: "12px",
    color: "var(--amber)",
    textShadow: "var(--glow)",
    fontFamily: "'Inter', sans-serif",
  },
  msgPrompt: {
    color: "var(--muted)",
    textShadow: "none",
  },
  agentMsg: {
    fontFamily: "'Inter', sans-serif",
  },
  msgName: {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  msgTime: {
    fontSize: "10px",
    color: "var(--muted)",
    textShadow: "none",
    marginLeft: "8px",
  },
  msgContent: {
    fontSize: "12px",
    color: "var(--amber)",
    textShadow: "var(--glow)",
    marginTop: "1px",
    paddingLeft: "4px",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
  },
  inputPrompt: {
    color: "var(--muted)",
    fontSize: "11px",
    textShadow: "none",
    flexShrink: 0,
  },
  inputField: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--amber)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    textShadow: "var(--glow)",
    caretColor: "var(--amber)",
  },
  sendBtn: {
    background: "transparent",
    border: "1px solid var(--amber)",
    color: "var(--amber)",
    fontFamily: "'Inter', sans-serif",
    fontSize: "10px",
    padding: "2px 8px",
    cursor: "pointer",
    textShadow: "none",
    flexShrink: 0,
  },
  empty: {
    fontSize: "11px",
    color: "var(--muted)",
    textShadow: "none",
    padding: "12px",
  },
};
