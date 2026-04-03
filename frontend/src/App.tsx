import { useState, useEffect } from "react";
import ConfigWizard from "./components/ConfigWizard";
import Forum from "./components/Forum";

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
      <div style={S.screen}>
        <div style={S.loadText}>
          GAZE<span style={S.cursor}>█</span>
        </div>
        <div style={S.loadSub}>// initializing...</div>
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

  return <Forum workspaceName={workspaceName} />;
}

const S: Record<string, React.CSSProperties> = {
  screen: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0a0a",
    gap: "12px",
    fontFamily: "'JetBrains Mono', monospace",
  },
  loadText: {
    fontSize: "32px",
    color: "#33ff00",
    letterSpacing: "0.3em",
    textTransform: "uppercase" as const,
    textShadow: "0 0 12px rgba(51,255,0,0.8)",
  },
  loadSub: {
    fontSize: "12px",
    color: "#1f521f",
    letterSpacing: "0.1em",
    textShadow: "none",
  },
  cursor: {
    animation: "blink 1s step-end infinite",
    display: "inline-block",
    marginLeft: "4px",
  },
};
