import { useState, useEffect } from "react";
import ConfigWizard from "./components/ConfigWizard";
import Forum from "./components/Forum";
import { GazeSSEProvider } from "./context/GazeSSE";

type AppState = "loading" | "config" | "forum";

export default function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [workspaceName, setWorkspaceName] = useState("Gaze");
  const [repoPath, setRepoPath] = useState("~");

  const checkStatus = () => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.initialized && !data.partial) {
          setRepoPath(data.repoPath ?? "~");
          // Also fetch workspace name from config
          return fetch("/api/config")
            .then((r) => r.json())
            .then((cfg) => {
              setWorkspaceName(cfg.workspace_name ?? "Gaze");
              setAppState("forum");
            });
        } else {
          setAppState("config");
        }
      })
      .catch(() => setAppState("config"));
  };

  useEffect(() => { checkStatus(); }, []);

  if (appState === "loading") {
    return (
      <div className="loading-screen">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.5 }}>
          <path d="M8 4 L4 12 L12 12 Z" fill="var(--text-primary)"/>
          <path d="M24 4 L20 12 L28 12 Z" fill="var(--text-primary)"/>
          <ellipse cx="16" cy="20" rx="11" ry="10" fill="var(--text-primary)"/>
          <ellipse cx="11" cy="19" rx="4" ry="3.5" fill="var(--bg)"/>
          <ellipse cx="21" cy="19" rx="4" ry="3.5" fill="var(--bg)"/>
          <circle cx="11" cy="19" r="1.5" fill="var(--amber)"/>
          <circle cx="21" cy="19" r="1.5" fill="var(--amber)"/>
          <ellipse cx="16" cy="24" rx="2" ry="1.2" fill="var(--bg)"/>
        </svg>
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Loading...</div>
      </div>
    );
  }

  if (appState === "config") {
    return (
      <ConfigWizard
        onComplete={() => checkStatus()}
      />
    );
  }

  return (
    <GazeSSEProvider>
      <Forum workspaceName={workspaceName} repoPath={repoPath} />
    </GazeSSEProvider>
  );
}


