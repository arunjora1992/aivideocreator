# AI Video Creator — instructions for the Claude CLI

This container runs an automated video pipeline. When the user asks you to
create, write, or rewrite a video's script, edit the scenes file directly —
that alone is enough to produce a finished video, with no other manual step
on their end.

## What to do

Edit `remotion/src/starter/scenes.json`:

```json
{
  "compositionId": "starter",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "scenes": [
    { "id": "01-intro", "title": "...", "body": "...", "narration": "..." }
  ]
}
```

- `id`: short kebab-case slug, unique per scene, ordered (e.g. `01-intro`, `02-benefits`, `03-cta`).
- `title`: short headline shown big on screen.
- `body`: one supporting line shown under the title (optional, can be empty).
- `narration`: the sentence(s) spoken as voiceover for that scene — write this
  as natural spoken language (spell out abbreviations, avoid symbols that a
  TTS engine would mangle).
- Keep `compositionId`/`fps`/`width`/`height` unless the user asks otherwise.

Write the whole file (all scenes), not a partial edit — the app treats a
save as "the new script."

## What happens automatically after you save

The GUI server watches this file. A few seconds after you finish editing it:
1. Voiceover is generated for every scene, using whichever backend/voice the
   user already picked in the GUI's Voiceover tab (that's the one manual
   choice they make — it happens before or independently of your edit, not
   something you need to set).
2. The video is rendered to MP4.
3. Progress is visible live in the GUI's "Progress" tab.

If no voice has been picked yet, the pipeline stops after step 1 with a
clear error — tell the user to pick a backend/voice in the Voiceover tab,
then it'll pick up automatically next time you save.

Do not try to trigger voiceover generation or rendering yourself (no API
call, no script) — editing `scenes.json` is the only thing needed.
