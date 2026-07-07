#!/usr/bin/env bash
set -e

# Persist the Claude CLI login across image rebuilds. The claude_config volume
# is mounted at /root/.claude (which holds .credentials.json), but the CLI also
# writes /root/.claude.json in the home dir — NOT on a volume — so it would be
# lost on rebuild. Relocate it into the volume and symlink it back.
mkdir -p /root/.claude
if [ ! -L /root/.claude.json ]; then
  [ -f /root/.claude.json ] && mv -f /root/.claude.json /root/.claude/claude.json || true
  ln -sf /root/.claude/claude.json /root/.claude.json
fi

# Seed the (initially empty) voiceover volume with the clips baked into the
# image, so the demo renders with audio out of the box while still letting
# regenerated clips persist in the volume.
DEF=/app/remotion/public/voiceover.default
VO=/app/remotion/public/voiceover
if [ -d "$DEF" ] && [ -z "$(ls -A "$VO" 2>/dev/null || true)" ]; then
  mkdir -p "$VO"
  cp -a "$DEF/." "$VO/"
  echo "Seeded voiceover volume from image defaults."
fi

exec supervisord -c /app/supervisord.conf
