#!/usr/bin/env bash
set -e

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
