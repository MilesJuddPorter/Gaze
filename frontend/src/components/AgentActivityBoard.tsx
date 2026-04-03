import React, { useState } from "react";
import type { Agent } from "../types";
import AgentActivityCard from "./AgentActivityCard";
import AgentDeepDive from "./AgentDeepDive";

interface Props {
  agents: Agent[];
  onAgentSelect?: (agentId: number) => void;
}

export default function AgentActivityBoard({ agents, onAgentSelect }: Props) {
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);

  if (expandedAgentId !== null) {
    const agent = agents.find((a) => a.id === expandedAgentId);
    if (agent) {
      return (
        <AgentDeepDive
          agent={agent}
          onClose={() => setExpandedAgentId(null)}
          onDm={() => onAgentSelect?.(agent.id)}
        />
      );
    }
  }

  return (
    <div className="agent-activity-board bg-black/40 rounded border border-gray-700 p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="text-xs font-mono text-gray-500 mb-4 pb-2 border-b border-gray-700">
        AGENT ACTIVITY
      </div>
      {agents.length === 0 ? (
        <div className="text-xs font-mono text-gray-600 text-center py-8">
          no agents configured
        </div>
      ) : (
        agents.map((agent) => (
          <AgentActivityCard
            key={agent.id}
            agent={agent}
            onExpand={() => setExpandedAgentId(agent.id)}
          />
        ))
      )}
    </div>
  );
}
