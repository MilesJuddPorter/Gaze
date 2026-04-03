import React, { useEffect, useState } from "react";
import type { Agent } from "../types";

interface ToolRecord {
  tool_name: string;
  tool_input: Record<string, unknown>;
  result_summary: string;
  status: "ok" | "error";
  timestamp: string;
}

interface Props {
  agent: Agent;
  onClose: () => void;
  onDm: () => void;
}

export default function AgentDeepDive({ agent, onClose, onDm }: Props) {
  const [toolLog, setToolLog] = useState<ToolRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch recent tool activity for this agent
    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/agents/${agent.id}/activity?limit=10`);
        if (res.ok) {
          const data = await res.json();
          setToolLog(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch agent activity:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [agent.id]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 p-4 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-600 rounded p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: "slideInRight 200ms ease forwards",
          borderColor: agent.avatar_color + "60",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold" style={{ color: agent.avatar_color }}>
              [{agent.name.toUpperCase()}]
            </span>
            <span className="text-sm text-gray-400">{agent.role}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Current Action */}
        <div className="mb-6">
          <div className="text-xs font-mono text-gray-500 mb-2 uppercase">Current Action</div>
          <div className="text-sm font-mono text-green-400">
            {agent.current_action || "—"}
          </div>
        </div>

        {/* Tool Call Log */}
        <div className="mb-6">
          <div className="text-xs font-mono text-gray-500 mb-3 uppercase">Tool Call Log</div>
          {loading ? (
            <div className="text-xs text-gray-600">loading...</div>
          ) : toolLog.length === 0 ? (
            <div className="text-xs text-gray-600">no tools called yet</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {toolLog.map((call, idx) => (
                <div key={idx} className="text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">
                      {new Date(call.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-amber-400">{call.tool_name}</span>
                    <span className={call.status === "ok" ? "text-green-400" : "text-red-400"}>
                      [{call.status.toUpperCase()}]
                    </span>
                  </div>
                  <div className="text-gray-600 ml-4 text-xs">
                    {call.result_summary || "(no summary)"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-mono border border-gray-600 text-gray-400 hover:text-gray-200 rounded"
          >
            CLOSE
          </button>
          <button
            onClick={onDm}
            className="px-3 py-1 text-xs font-mono border border-green-600 text-green-400 hover:text-green-300 rounded"
          >
            DM {agent.name.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}
