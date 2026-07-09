#!/usr/bin/env bash
# Launched inside the ttyd web terminal (Claude CLI tab).
#
# ttyd starts this program fresh for EACH browser connection. Refreshing the
# GUI page (or a dropped websocket) therefore reconnects ttyd and would spawn a
# brand-new shell — killing any running `claude` and losing its conversation.
#
# To make the session survive refreshes/reconnects, we host the shell inside a
# persistent tmux session and simply (re)attach to it here. The `claude` process
# keeps running in tmux between connections.
SESSION="${CLAUDE_TMUX_SESSION:-claude}"

banner() {
  clear
  echo "=============================================="
  echo "  Claude CLI"
  echo "  Run:  claude"
  echo "  First launch: use  /login  to sign in with"
  echo "  your Claude account (persisted across restarts)."
  echo "  This session survives browser refreshes."
  echo "=============================================="
  echo
}

# When re-invoked as the tmux session's own program, show the banner and hand
# off to an interactive login shell.
if [ "$1" = "--inner" ]; then
  banner
  cd /app 2>/dev/null
  exec bash -l
fi

# ttyd entrypoint: attach to the persistent tmux session, creating it (running
# ourselves with --inner) on first connect. `-A` = attach if it exists.
if command -v tmux >/dev/null 2>&1; then
  exec tmux new-session -A -s "$SESSION" "$0" --inner
fi

# tmux unavailable — fall back to a plain (non-persistent) shell.
banner
cd /app 2>/dev/null
exec bash -l
