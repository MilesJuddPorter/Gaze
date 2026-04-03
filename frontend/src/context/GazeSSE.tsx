/**
 * GazeSSE — single shared EventSource for the entire app.
 *
 * Instead of each component opening its own /api/messages/stream connection,
 * everything subscribes to this context. Forum and AgentActivityBoard both
 * need SSE events — this eliminates the duplicate connection Cat flagged.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Message, Agent } from "../types";

// ─── Event types from the backend ────────────────────────────────────────────

export interface ToolStartEvent {
  agent_id: number;
  tool_name: string;
  tool_input: Record<string, unknown>;
  timestamp: string;
}

export interface ToolEndEvent {
  agent_id: number;
  tool_name: string;
  result_summary: string;
  status: "ok" | "error";
  timestamp: string;
}

export interface AgentActivityEvent {
  agent_id: number;
  action_type: string;
  description: string;
  timestamp: string;
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface GazeSSEContextValue {
  messages: Message[];
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  /** Subscribe to tool_start events. Returns unsubscribe fn. */
  onToolStart: (handler: (e: ToolStartEvent) => void) => () => void;
  /** Subscribe to tool_end events. Returns unsubscribe fn. */
  onToolEnd: (handler: (e: ToolEndEvent) => void) => () => void;
  /** Subscribe to agent_activity events. Returns unsubscribe fn. */
  onAgentActivity: (handler: (e: AgentActivityEvent) => void) => () => void;
  /** Subscribe to dm_message events (agent-to-agent DMs). Returns unsubscribe fn. */
  onDmMessage: (handler: (e: Record<string, unknown>) => void) => () => void;
  connected: boolean;
}

const GazeSSEContext = createContext<GazeSSEContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function GazeSSEProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [connected, setConnected] = useState(false);

  // Handler registries — use refs so subscriptions don't trigger re-renders
  const toolStartHandlers = useRef<Set<(e: ToolStartEvent) => void>>(new Set());
  const toolEndHandlers = useRef<Set<(e: ToolEndEvent) => void>>(new Set());
  const agentActivityHandlers = useRef<Set<(e: AgentActivityEvent) => void>>(new Set());
  const dmMessageHandlers = useRef<Set<(e: Record<string, unknown>) => void>>(new Set());

  // Single SSE connection, with reconnect on error
  useEffect(() => {
    let es: EventSource;
    let retryTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      es = new EventSource("/api/messages/stream");

      es.addEventListener("open", () => setConnected(true));

      // New chat message
      es.addEventListener("message", (e) => {
        try {
          const msg: Message = JSON.parse(e.data);
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
        } catch { /* ignore */ }
      });

      // Agent status update
      es.addEventListener("agent_status", (e) => {
        try {
          const { agentId, status, action, is_ooo } = JSON.parse(e.data);
          setAgents((prev) =>
            prev.map((a) => {
              if (a.id !== agentId) return a;
              const updates: Partial<typeof a> = {};
              if (status !== undefined) { updates.status = status; updates.current_action = action; }
              if (is_ooo !== undefined) updates.is_ooo = is_ooo;
              return { ...a, ...updates };
            })
          );
        } catch { /* ignore */ }
      });

      // Tool lifecycle events — fan out to subscribers
      es.addEventListener("tool_start", (e) => {
        try {
          const data: ToolStartEvent = JSON.parse(e.data);
          toolStartHandlers.current.forEach((h) => h(data));
        } catch { /* ignore */ }
      });

      es.addEventListener("tool_end", (e) => {
        try {
          const data: ToolEndEvent = JSON.parse(e.data);
          toolEndHandlers.current.forEach((h) => h(data));
        } catch { /* ignore */ }
      });

      es.addEventListener("agent_activity", (e) => {
        try {
          const data: AgentActivityEvent = JSON.parse(e.data);
          agentActivityHandlers.current.forEach((h) => h(data));
        } catch { /* ignore */ }
      });

      es.addEventListener("dm_message", (e) => {
        try {
          const data = JSON.parse(e.data) as Record<string, unknown>;
          dmMessageHandlers.current.forEach((h) => h(data));
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        retryTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      es?.close();
      clearTimeout(retryTimer);
    };
  }, []);

  const onToolStart = (handler: (e: ToolStartEvent) => void) => {
    toolStartHandlers.current.add(handler);
    return () => toolStartHandlers.current.delete(handler);
  };

  const onToolEnd = (handler: (e: ToolEndEvent) => void) => {
    toolEndHandlers.current.add(handler);
    return () => toolEndHandlers.current.delete(handler);
  };

  const onAgentActivity = (handler: (e: AgentActivityEvent) => void) => {
    agentActivityHandlers.current.add(handler);
    return () => agentActivityHandlers.current.delete(handler);
  };

  const onDmMessage = (handler: (e: Record<string, unknown>) => void) => {
    dmMessageHandlers.current.add(handler);
    return () => dmMessageHandlers.current.delete(handler);
  };

  return (
    <GazeSSEContext.Provider
      value={{ messages, agents, setAgents, onToolStart, onToolEnd, onAgentActivity, onDmMessage, connected }}
    >
      {children}
    </GazeSSEContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGazeSSE(): GazeSSEContextValue {
  const ctx = useContext(GazeSSEContext);
  if (!ctx) throw new Error("useGazeSSE must be used inside GazeSSEProvider");
  return ctx;
}
