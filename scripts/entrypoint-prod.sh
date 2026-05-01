#!/bin/sh
# Production entrypoint for the backend container.
#
# Default behavior (no args passed): runs `node src/server.js` and pipes its
# combined stdout+stderr through scripts/log-rotator.js, which writes
# daily-dated files to $LOG_DIR (default /app/logs), keeps `docker logs`
# working, rotates at UTC midnight, and prunes files older than 7 days.
#
# Override behavior (args passed via compose `command:` / `docker run ...`):
# `exec` the passed command DIRECTLY with no rotator wrapper. This lets
# one-shot sibling services (e.g. db-init running `prisma migrate deploy`)
# share the same image without being hijacked into the server pipeline.
#
# Failure mode for the default pipeline: if the rotator dies, the pipeline
# exits and Docker restarts the container -- preferable to silent log loss.
set -e

export LOG_DIR="${LOG_DIR:-/app/logs}"
mkdir -p "$LOG_DIR"

if [ "$#" -gt 0 ]; then
    # Caller supplied a command -- run it verbatim, no log rotation wrapper.
    # Use `exec` so the child becomes PID 1 and signal handling works cleanly.
    exec "$@"
fi

# Default: run the server through the rotator.
exec node src/server.js 2>&1 | node scripts/log-rotator.js
