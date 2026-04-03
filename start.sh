#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# The directory WHERE gaze is being launched (defaults to cwd)
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
# Fixed port means vite.config.ts bakes in the correct proxy target at startup
export VITE_BACKEND_PORT="$BACKEND_PORT"

# Start backend (from repo root so relative imports work)
cd "$REPO_ROOT/backend"
GAZE_DIRECT=1 npx tsx src/index.ts &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in $(seq 1 20); do
  if curl -s "http://localhost:$BACKEND_PORT/api/health" > /dev/null 2>&1; then
    echo "Backend ready."
    break
  fi
  sleep 0.5
done

# Start frontend dev server
cd "$REPO_ROOT/frontend"
npx vite --port "$FRONTEND_PORT" &
FRONTEND_PID=$!

# Wait for frontend
sleep 2

# Open browser
echo ""
echo "Gaze is running!"
echo "  Open: http://localhost:$FRONTEND_PORT"
echo ""
echo "Press Ctrl-C to stop."
open "http://localhost:$FRONTEND_PORT" 2>/dev/null || true

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
