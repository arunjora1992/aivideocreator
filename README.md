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

The GUI tabs (modern dark/light UI — toggle with the ◐ button):

1. **Studio** — the Remotion Studio render/preview page, embedded.
2. **Script** — edit each scene's title / body / narration, add/remove/reorder
   scenes, and **Save** — no code editing needed to build a new video.
3. **Voiceover** — choose a TTS **backend** and **voice**, **preview** the voice,
   then generate narration for every scene.
4. **Render** — render to an MP4 with a live progress bar; results land in a
   **persistent volume** and appear in an outputs gallery you can play and
   **download** right there.
5. **Claude CLI** — a web terminal running the `claude` CLI. On first use run
   `/login` to **sign in with your Claude account** (persisted in a Docker
   volume, so it survives restarts). Ask Claude to write or rewrite your scenes.

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

## The project

`COMPOSITION_ID` (default `starter`) is a neutral 1920×1080 starter video whose
content lives in **`remotion/src/starter/scenes.json`** — a plain list of scenes
(`id`, `title`, `body`, `narration`). The GUI's **Script** tab reads and writes
this file, so building a new video is: edit the script → pick a voice → generate
voiceover → render. Each scene auto-sizes to the length of its narration audio.

To go further, edit `remotion/src/starter/Scene.tsx` (or add new components) — or
just ask Claude in the **Claude CLI** tab to build richer scenes, then regenerate
and re-render from the GUI.

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
    └── src/starter/         # the starter composition
        ├── scenes.json      # ← the editable project content (Script tab writes this)
        ├── StarterVideo.tsx
        └── Scene.tsx        # per-scene renderer — customize me
```

## Notes

- The Claude CLI tab needs either an interactive `/login` or an `ANTHROPIC_API_KEY`
  in `.env`.
- Rendering runs headless Chromium inside the container (installed at build time).
