#!/bin/sh
# Production entrypoint for the backend container.
#
# Wraps `node src/server.js` so its stdout+stderr are piped through a small
# rotator (scripts/log-rotator.js) which:
#   - writes daily-dated files to $LOG_DIR (default /app/logs)
#   - re-emits everything to its own stdout, so `docker logs` still works
#   - rotates at UTC midnight without needing a container restart
#   - prunes files older than 7 days
#
# Failure mode: if the rotator dies, the pipeline exits and Docker restarts
# the container -- preferable to silent log loss.
set -e

export LOG_DIR="${LOG_DIR:-/app/logs}"
mkdir -p "$LOG_DIR"

# `set -o pipefail` is bash-only; in /bin/sh we rely on exec + Docker restart.
exec node src/server.js 2>&1 | node scripts/log-rotator.js
