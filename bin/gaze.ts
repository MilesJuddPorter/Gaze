#!/usr/bin/env tsx
import path from "path";
import fs from "fs";
import { createServer } from "net";

// Parse CLI args
const args = process.argv.slice(2);
let targetDir = process.cwd();
let port = 0; // 0 = auto-pick

let resetMode = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dir" && args[i + 1]) {
    targetDir = path.resolve(args[i + 1]);
    i++;
  } else if (args[i] === "--port" && args[i + 1]) {
    port = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === "--reset") {
    resetMode = true;
  }
}

// Create .gaze directory
const gazeDir = path.join(targetDir, ".gaze");

// Handle --reset: wipe .gaze/ and exit (fresh start on next launch)
if (resetMode) {
  if (fs.existsSync(gazeDir)) {
    fs.rmSync(gazeDir, { recursive: true, force: true });
    console.log(`[RESET] Wiped ${gazeDir}`);
    console.log(`[RESET] Run 'gaze' again to start fresh.`);
  } else {
    console.log(`[RESET] Nothing to reset — ${gazeDir} does not exist.`);
  }
  process.exit(0);
}

if (!fs.existsSync(gazeDir)) {
  fs.mkdirSync(gazeDir, { recursive: true });
  console.log(`Created ${gazeDir}`);
}

// Find a free port if not specified
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not get port"));
        return;
      }
      const p = address.port;
      server.close(() => resolve(p));
    });
    server.on("error", reject);
  });
}

async function main() {
  if (port === 0) {
    port = await findFreePort();
  }

  // Set env vars for the server
  process.env.GAZE_DIR = gazeDir;
  process.env.GAZE_PORT = String(port);

  console.log(`
  ██████╗  █████╗ ███████╗███████╗
 ██╔════╝ ██╔══██╗╚══███╔╝██╔════╝
 ██║  ███╗███████║  ███╔╝ █████╗
 ██║   ██║██╔══██║ ███╔╝  ██╔══╝
 ╚██████╔╝██║  ██║███████╗███████╗
  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝

Repo-local AI agent workspace
`);
  console.log(`  Workspace: ${targetDir}`);
  console.log(`  State:     ${gazeDir}`);
  console.log(`  Server:    http://localhost:${port}`);
  console.log(`\nStarting server...`);

  // Dynamically import server to allow tsx to handle it
  const { startServer } = await import("../backend/src/index.js");
  await startServer(gazeDir, port);

  // Open browser
  try {
    const { default: open } = await import("open");
    await open(`http://localhost:${port}`);
  } catch {
    console.log(`\nOpen http://localhost:${port} in your browser.`);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
