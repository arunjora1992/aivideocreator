# AI Video Creator

A fully containerized studio for building narrated explainer videos with
[Remotion](https://www.remotion.dev/), a choice of voiceover engines, and the
Claude CLI — all driven from one browser GUI. Everything runs inside a single
Docker image via `docker compose`; nothing runs on the host.

## What's inside

One image, one `docker compose up`, four things running under `supervisord`:

| Port | Service | GUI tab |
|------|---------|---------|
| 8080 | **GUI + API** (tabbed page, voiceover, render) | — (open this) |
| 3000 | **Remotion Studio** — live preview + render page | *Render / Studio* |
| 7681 | **Claude CLI** in a web terminal | *Claude CLI* |

The GUI tabs:

1. **Render / Studio** — the Remotion Studio render/preview page, embedded.
2. **Claude CLI** — a web terminal running the `claude` CLI. On first use run
   `/login` to **sign in with your Claude account** (the login is persisted in a
   Docker volume, so it survives restarts).
3. **Voiceover** — choose a TTS **backend** and **voice**, then regenerate the
   narration for every scene.
4. **Render MP4** — render the composition to an MP4 with a live progress bar;
   the result is written to a **persistent volume** and playable/downloadable
   right in the tab.

## Quick start

```bash
cp .env.example .env      # add your ElevenLabs key (optional)
docker compose up --build
```

Then open **http://localhost:8080**.

## Voiceover backends

Pick per-render in the Voiceover tab:

- **`elevenlabs`** — cloud, highest quality. Needs `ELEVENLABS_API_KEY` in `.env`.
  Voices are listed live from your account. (Free-tier accounts can use the
  default/premade voices, not the "library" voices.)
- **`piper`** — offline neural TTS, bundled in the image with an English voice.
  No API key. Add more voices by dropping `*.onnx` + `*.onnx.json` files into the
  `PIPER_VOICES_DIR` (`/opt/piper/voices`).
- **`espeak`** — offline, always available, robotic. Zero setup.

WAV output from the offline backends is converted to MP3 with ffmpeg, so the
Remotion composition consumes every backend the same way.

## Persistent volumes (PV)

Declared in `docker-compose.yml`:

| Volume | Mount | Purpose |
|--------|-------|---------|
| `output` | `/app/remotion/out` | **Rendered MP4s** — survive restarts |
| `claude_config` | `/root/.claude` | Claude CLI login |
| `voiceover` | `/app/remotion/public/voiceover` | Regenerated voiceover clips (seeded from image defaults on first run) |

## The composition

`COMPOSITION_ID` (default `identity-integration`) is a ~107 s, 1920×1080 narrated
explainer on **Keycloak + Google SSO + FreeIPA** integration, built as custom
diagram scenes in `remotion/src/integration/`. Edit `scenes.ts` (narration) or the
scene components, regenerate voiceover, and re-render — the composition auto-sizes
each scene to its audio.

Use the **Claude CLI** tab to have Claude edit the scenes/components for you, then
regenerate and re-render from the GUI.

## Layout

```
.
├── docker-compose.yml      # services + persistent volumes
├── Dockerfile              # Node + Remotion + Chromium + ffmpeg + ttyd + piper + claude
├── supervisord.conf        # runs studio + claude terminal + gui
├── scripts/entrypoint.sh   # seeds the voiceover volume on first run
├── gui/                    # zero-dependency Node GUI + API server
│   ├── server.mjs
│   ├── lib/tts.mjs         # elevenlabs / piper / espeak backends
│   └── public/index.html   # the tabbed page
└── remotion/               # the Remotion project (the video itself)
    ├── src/integration/    # the diagram-explainer composition
    └── generate-voiceover.ts
```

## Notes

- The Claude CLI tab needs either an interactive `/login` or an `ANTHROPIC_API_KEY`
  in `.env`.
- Rendering runs headless Chromium inside the container (installed at build time).
