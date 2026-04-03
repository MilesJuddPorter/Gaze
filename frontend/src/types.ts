export interface Agent {
  id: number;
  name: string;
  role: string;
  system_prompt: string;
  avatar_color: string;
  status: "idle" | "thinking" | "acting" | "sleeping";
  current_action: string | null;
  check_interval: number;
  last_read_at: string;
  created_at: string;
  running?: boolean;
  is_ooo?: number; // 0 or 1
}

export interface Reaction {
  id: number;
  message_id: number;
  reactor_name: string;
  emoji: string;
}

export interface Message {
  id: number;
  agent_id: number | null;
  author_name: string;
  sender_name: string; // DB column name, same as author_name
  content: string;
  message_type: string;
  timestamp: string;
  reactions?: Reaction[];
}

export interface AgentConfig {
  name: string;
  role: string;
  system_prompt: string;
  avatar_color: string;
  check_interval: number;
}

export interface GazeConfig {
  workspace_name: string;
  agents: AgentConfig[];
  created_at?: string;
}
