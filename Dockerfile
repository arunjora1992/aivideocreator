# AI Video Creator — single image running Remotion Studio, the Claude CLI
# terminal, a voiceover engine, and the tabbed GUI, all under supervisord.
FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PIPER_VOICES_DIR=/opt/piper/voices \
    PATH=/opt/piper:$PATH \
    GUI_PORT=8080 \
    STUDIO_PORT=3000 \
    TTYD_PORT=7681 \
    COMPOSITION_ID=identity-integration

# --- system deps: ffmpeg, offline TTS (espeak-ng), supervisor, and the
#     shared libraries Chromium (Remotion's renderer) needs on Debian ---
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg espeak-ng supervisor curl ca-certificates \
      libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
      libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 libx11-6 \
      libxcb1 libxext6 libxi6 libglib2.0-0 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# --- ttyd (web terminal for the Claude CLI tab) — best effort ---
RUN ARCH=$(uname -m) && \
    curl -fsSL -o /usr/local/bin/ttyd \
      "https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.${ARCH}" \
    && chmod +x /usr/local/bin/ttyd || echo "WARN: ttyd install skipped"

# --- Piper offline neural TTS + one English voice — best effort ---
RUN set -e; ARCH=$(uname -m); \
    if [ "$ARCH" = "x86_64" ]; then \
      curl -fsSL -o /tmp/piper.tar.gz \
        "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz" \
      && tar -xzf /tmp/piper.tar.gz -C /opt && rm /tmp/piper.tar.gz \
      && mkdir -p "$PIPER_VOICES_DIR" \
      && curl -fsSL -o "$PIPER_VOICES_DIR/en_US-lessac-medium.onnx" \
         "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx" \
      && curl -fsSL -o "$PIPER_VOICES_DIR/en_US-lessac-medium.onnx.json" \
         "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium/en_US-lessac-medium.onnx.json" ; \
    fi || echo "WARN: piper install skipped (espeak backend still available)"

# --- Claude Code CLI (for the login + CLI tab) — best effort ---
RUN npm install -g @anthropic-ai/claude-code || echo "WARN: claude CLI install skipped"

WORKDIR /app

# Install Remotion project deps first (better layer caching)
COPY remotion/package.json remotion/package-lock.json ./remotion/
RUN cd remotion && npm ci

# App source
COPY remotion ./remotion
COPY gui ./gui
COPY supervisord.conf ./supervisord.conf
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY scripts/claude-shell.sh /usr/local/bin/claude-shell.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/claude-shell.sh

# Keep a pristine copy of the shipped voiceover so the entrypoint can seed the
# (persistent) voiceover volume on first run.
RUN cp -a remotion/public/voiceover remotion/public/voiceover.default

# Download the Chromium headless shell Remotion renders with
RUN cd remotion && npx remotion browser ensure

EXPOSE 8080 3000 7681

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
