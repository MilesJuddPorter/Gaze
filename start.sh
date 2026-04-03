#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# The directory WHERE gaze state lives — defaults to cwd (where user ran from)
TARGET_DIR="${GAZE_TARGET_DIR:-$PWD}"
BACKEND_PORT="${GAZE_PORT:-7777}"
FRONTEND_PORT="${GAZE_FRONTEND_PORT:-5173}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)   TARGET_DIR="$(realpath "$2")"; shift 2 ;;
    --port)  BACKEND_PORT="$2"; shift 2 ;;
    --reset)
      GAZE_DIR_RESET="${TARGET_DIR}/.gaze"
      if [ -d "$GAZE_DIR_RESET" ]; then
        rm -rf "$GAZE_DIR_RESET"
        echo "[RESET] Wiped $GAZE_DIR_RESET"
      else
        echo "[RESET] Nothing to reset — $GAZE_DIR_RESET does not exist."
      fi
      exit 0
      ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Check API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo ""
  echo "[ERR] ANTHROPIC_API_KEY is not set."
  echo "      export ANTHROPIC_API_KEY=your_key_here"
  echo "      then re-run: $0"
  echo ""
  exit 1
fi

GAZE_DIR="${TARGET_DIR}/.gaze"
mkdir -p "$GAZE_DIR"

echo ""
echo "  ██████╗  █████╗ ███████╗███████╗"
echo " ██╔════╝ ██╔══██╗╚══███╔╝██╔════╝"
echo " ██║  ███╗███████║  ███╔╝ █████╗  "
echo " ██║   ██║██╔══██║ ███╔╝  ██╔══╝  "
echo " ╚██████╔╝██║  ██║███████╗███████╗"
echo "  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝"
echo ""
echo "  Workspace : $TARGET_DIR"
echo "  State     : $GAZE_DIR"
echo "  Backend   : http://localhost:$BACKEND_PORT"
echo "  Frontend  : http://localhost:$FRONTEND_PORT"
echo ""

export GAZE_DIR="$GAZE_DIR"
export GAZE_PORT="$BACKEND_PORT"
export VITE_BACKEND_PORT="$BACKEND_PORT"

# Check for API key and warn loudly if missing
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "  [WARN] ANTHROPIC_API_KEY is not set"
  echo "         Agents won't respond until you run:"
  echo "         export ANTHROPIC_API_KEY=sk-ant-..."
  echo ""
fi

# Install deps if needed
if [ ! -d "$REPO_ROOT/backend/node_modules" ]; then
  echo "Installing backend deps..."
  cd "$REPO_ROOT/backend" && npm install --silent
fi
if [ ! -d "$REPO_ROOT/frontend/node_modules" ]; then
  echo "Installing frontend deps..."
  cd "$REPO_ROOT/frontend" && npm install --silent
fi

# Start backend (must cd to repo backend dir so imports resolve correctly)
cd "$REPO_ROOT/backend"
GAZE_DIRECT=1 npx tsx src/index.ts &
BACKEND_PID=$!

# Wait for backend to be ready (up to 10s)
echo "Starting backend..."
for i in $(seq 1 20); do
  if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
    echo "[OK] Backend ready at http://localhost:$BACKEND_PORT"
    break
  fi
  sleep 0.5
done

# Verify backend actually started
if ! curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
  echo "[ERR] Backend failed to start. Check for errors above."
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi

# Start frontend dev server
cd "$REPO_ROOT/frontend"
npx vite --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

sleep 2

echo ""
echo "[OK] Gaze is running!"
echo "     Open: http://localhost:$FRONTEND_PORT"
echo "     Workspace: $TARGET_DIR"
echo ""
echo "     To launch from a different folder:"
echo "     cd /path/to/your/project && GAZE_TARGET_DIR=\$PWD $REPO_ROOT/start.sh"
echo ""
echo "Press Ctrl-C to stop."
open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
