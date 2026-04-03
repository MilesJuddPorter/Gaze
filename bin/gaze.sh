#!/usr/bin/env bash
# Gaze CLI wrapper
# Resolves the Gaze install directory from the symlink and runs start.sh
# with the current working directory as the target workspace.

GAZE_INSTALL="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")/.." && pwd)"

exec "$GAZE_INSTALL/start.sh" --dir "$PWD" "$@"
