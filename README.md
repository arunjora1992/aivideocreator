# AI Video Creator

A fully containerized studio for building narrated explainer videos with
[Remotion](https://www.remotion.dev/) — script it yourself or hand it to the
Claude CLI, pick a voice once, and the rest (voiceover, optional talking-head
avatar, render) happens automatically. Everything runs in Docker; nothing
runs on the host.

## Architecture

```
                    ┌─────────────────────┐
   https (self-     │        nginx        │   only externally reachable
   signed cert) ───▶│  TLS termination    │   entry point — plain http is
                     └──────────┬──────────┘   never published to the host
                                │
                     ┌──────────▼──────────┐
                     │    aivideocreator    │  GUI + API, Remotion Studio,
                     │  (Node · supervisord)│  Claude CLI, the render itself
                     └───┬──────────┬───────┘
                         │          │
              ┌──────────▼──┐   ┌───▼─────────┐   ┌──────────────────┐
              │    xtts      │   │   wav2lip    │   │  hallo (optional) │
              │ voice cloning│   │ avatar (CPU) │   │ avatar (GPU only)  │
              │  (CPU)       │   │              │   │  see docker-       │
              └──────────────┘   └──────────────┘   │  compose.gpu.yml   │
                                                     └────────────────────┘
```

Each heavy dependency (PyTorch-based TTS cloning, lip-sync, diffusion avatar)
lives in its **own container/image** — the main Node image stays small and
none of these are required for the app to work at all.

## Quick start

```bash
cp .env.example .env      # add your ElevenLabs key (optional)
docker compose up --build
```

Open **`https://<host>:8943`** (self-signed cert — your browser will warn
once, click through). Use this https origin, not a plain-http address:
microphone access (for voice cloning) only works over a secure context.

| Port | What |
|------|------|
| 8943 | GUI — open this in your browser |
| 3943 | Remotion Studio (embedded as an iframe in the Studio tab) |
| 7943 | Claude CLI web terminal (embedded in the Claude tab) |

Nothing else is published to the host — the app containers talk to each
other over the internal Docker network only.

## GUI tabs

1. **Studio** — the Remotion Studio render/preview page, embedded.
2. **Script** — edit each scene's title / body / narration, add/remove/reorder
   scenes, **Save**. Ask Claude in the CLI tab instead if you'd rather not
   type it yourself — it already knows the file format (see `CLAUDE.md`).
3. **Voiceover** — pick a TTS backend + voice (the one manual choice the
   automated pipeline needs), preview it, clone a voice or set a presenter
   photo here too.
4. **Progress** — live timeline of the automated pipeline (Script → Voiceover
   → Avatar → Render) for the current and past runs.
5. **Render** — render to MP4, live progress bar, outputs gallery with
   play/download.
6. **Claude CLI** — web terminal running `claude`. First use: `/login` (login
   persists in a volume across restarts).

## Automation

The GUI **watches `scenes.json`**. A few seconds after it changes — whether
you hit Save in the Script tab or Claude edits it in the CLI tab — the
pipeline runs on its own:

1. **Voiceover** — every scene, using whichever backend/voice you already
   picked (persisted server-side, so it doesn't reset and doesn't need a
   browser tab open).
2. **Avatar** *(only if a presenter photo is set)* — a talking-head clip per
   scene.
3. **Render** — the final MP4.

If no voice has been picked yet, it stops after step 1 with a clear error in
the Progress tab. Nothing else needs triggering by hand.

## Voiceover backends

Pick in the Voiceover tab — persists server-side (`/api/voice-selection`)
until you change it:

- **`elevenlabs`** — cloud, highest quality, 29+ languages. Needs
  `ELEVENLABS_API_KEY` in `.env`.
- **`piper`** — offline neural TTS, bundled English voice. No API key.
- **`espeak`** — offline, always available, robotic — but exposes **all 131
  languages** espeak-ng ships (queried live, Tamil included), not a curated
  subset.
- **`xtts`** — offline **voice cloning** (Coqui XTTS-v2), CPU, own container.
  Record or upload a short clip of a voice in the Voiceover tab; it shows up
  in the voice list like any other voice. ~35s per sentence on CPU — that's
  inference cost, not a bug. License note: XTTS-v2 weights are under Coqui's
  non-commercial CPML; commercial use needs a paid Coqui license.

## Human/avatar video

Optional. Upload one presenter photo in the Voiceover tab and every scene
renders as a talking-head video instead of a text card (narration stays as
an on-screen caption). Two swappable engines (`gui/lib/avatar.mjs`):

| Engine | Requires | Look |
|--------|----------|------|
| **`wav2lip`** *(default)* | CPU, runs today | Mouth-sync only on the static photo — functional, a bit stiff/informal |
| **`hallo`** | **GPU** (CUDA 12.1) — see `docker-compose.gpu.yml` | Diffusion-based, real head motion, photorealistic — not built/tested in this repo's dev environment (no GPU here); build and smoke-test on your GPU host: `docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build` |

No photo uploaded → scenes render exactly as before this feature existed
(plain text/motion-graphics).

## Persistent volumes

| Volume | Mount | Purpose |
|--------|-------|---------|
| `output` | `.../remotion/out` | Rendered MP4s |
| `claude_config` | `/root/.claude` | Claude CLI login |
| `voiceover` | `.../public/voiceover` | Generated narration clips + the active voice selection |
| `voiceover_refs` | `.../public/voiceover_refs` | Uploaded/recorded xtts voice-clone clips |
| `presenter_photo` | `.../public/presenter` | The uploaded presenter photo |
| `avatar` | `.../public/avatar` | Generated per-scene talking-head clips |
| `xtts_models` | (xtts container) | XTTS-v2 model weights (~1.8GB, first-run download) |
| `hallo_models` | (hallo container, GPU overlay only) | Hallo model weights (~10GB+, first-run download) |

## The project

`COMPOSITION_ID` (default `starter`) is a neutral 1920×1080 starter video
whose content lives in **`remotion/src/starter/scenes.json`** — a plain list
of scenes (`id`, `title`, `body`, `narration`). Each scene auto-sizes to the
length of its narration audio.

To go further, edit `remotion/src/starter/Scene.tsx` / `StarterVideo.tsx` (or
add new components) — or ask Claude in the Claude CLI tab.

## Layout

```
.
├── docker-compose.yml       # base stack (no GPU required)
├── docker-compose.gpu.yml   # optional overlay: adds the hallo avatar engine
├── Dockerfile               # main app: Node + Remotion + Chromium + ffmpeg + ttyd + piper + claude
├── CLAUDE.md                # tells the Claude CLI how/where to write scenes.json
├── supervisord.conf         # runs studio + claude terminal + gui
├── scripts/
│   ├── entrypoint.sh        # seeds the voiceover volume on first run
│   └── claude-shell.sh      # persistent tmux session for the Claude CLI tab
├── docker/
│   ├── nginx/                # TLS-terminating reverse proxy (self-signed)
│   ├── xtts/                 # voice cloning service (Coqui XTTS-v2, CPU)
│   ├── wav2lip/               # default avatar engine (CPU)
│   └── hallo/                 # optional avatar engine (GPU only)
├── gui/                      # zero-dependency Node GUI + API server
│   ├── server.mjs             # routes + the automated pipeline orchestrator
│   ├── lib/tts.mjs            # elevenlabs / piper / espeak / xtts backends
│   ├── lib/avatar.mjs         # wav2lip / hallo dispatch
│   └── public/index.html      # the tabbed page
└── remotion/                  # the Remotion project (the video itself)
    └── src/starter/
        ├── scenes.json         # ← the editable project content
        ├── StarterVideo.tsx    # sequencing + avatar/audio compositing
        └── Scene.tsx           # per-scene renderer — customize me
```

## Notes

- The Claude CLI tab needs either an interactive `/login` or an
  `ANTHROPIC_API_KEY` in `.env`.
- Rendering runs headless Chromium inside the container (installed at build
  time).
- Disk: this stack pulls several multi-GB images/models (torch, checkpoints).
  If a build fails with "no space left on device", `docker builder prune -af`
  and `docker image prune -f` usually recover several GB.
