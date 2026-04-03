#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Default values
TARGET_DIR="${GAZE_TARGET_DIR:-$PWD}"
BACKEND_PORT="${GAZE_PORT:-0}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir) TARGET_DIR="$2"; shift 2 ;;
    --port) BACKEND_PORT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

GAZE_DIR="${TARGET_DIR}/.gaze"
mkdir -p "$GAZE_DIR"

echo "Starting Gaze..."
echo "  Workspace: $TARGET_DIR"
echo "  State:     $GAZE_DIR"

# Pick a free port if not set
if [ "$BACKEND_PORT" = "0" ] || [ -z "$BACKEND_PORT" ]; then
  BACKEND_PORT=$(python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()" 2>/dev/null || echo "3000")
fi

export GAZE_DIR="$GAZE_DIR"
export GAZE_PORT="$BACKEND_PORT"
export VITE_BACKEND_PORT="$BACKEND_PORT"

echo "  Backend:   http://localhost:$BACKEND_PORT"
echo "  Frontend:  http://localhost:5173"
echo ""

# Start backend
cd "$REPO_ROOT/backend"
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend (dev mode)
cd "$REPO_ROOT/frontend"
VITE_API_URL="http://localhost:$BACKEND_PORT" npm run dev &
FRONTEND_PID=$!

echo ""
echo "Gaze is running!"
echo "  Open: http://localhost:5173"
echo ""
echo "Press Ctrl-C to stop."

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
