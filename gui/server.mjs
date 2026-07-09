// AI Video Creator — GUI server (zero external deps, Node built-ins only).
//
// Tabs served by the single-page UI:
//   1. Studio    — iframe to Remotion Studio (render/preview page)      :3000
//   2. Claude    — iframe to a ttyd web terminal running the claude CLI :7681
//   3. Script    — edit each scene (title / body / narration) + generate voiceover
//   4. Render    — render the MP4, watch live progress, play + download outputs
import { createServer } from "node:http";
import { readFile, writeFile, readdir, stat, mkdir } from "node:fs/promises";
import { existsSync, watch as fsWatch } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { listVoices, synthesize, VOICE_REFS_DIR } from "./lib/tts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REMOTION_DIR = path.join(ROOT, "remotion");
const COMPOSITION_ID = process.env.COMPOSITION_ID || "starter";
const SCENES_JSON = path.join(REMOTION_DIR, "src", "starter", "scenes.json");
const VOICEOVER_DIR = path.join(REMOTION_DIR, "public", "voiceover", COMPOSITION_ID);
const OUT_DIR = path.join(REMOTION_DIR, "out");
// Which backend/voice to use for the automated pipeline — server-persisted
// (not just browser localStorage) so it survives across devices/restarts and
// is available even with no browser tab open.
const VOICE_SELECTION_FILE = path.join(REMOTION_DIR, "public", "voiceover", "selection.json");

const PORT = Number(process.env.GUI_PORT || 8080);
// Ports the browser uses to reach Studio / the terminal. These are the HOST
// ports (published by docker compose), which may differ from the container's
// internal ports — the GUI advertises these so the embedded iframes resolve.
const STUDIO_PORT = Number(
  process.env.PUBLIC_STUDIO_PORT || process.env.STUDIO_PORT || 3000,
);
const TTYD_PORT = Number(
  process.env.PUBLIC_TTYD_PORT || process.env.TTYD_PORT || 7681,
);
// https equivalents (served by the nginx service), used by the frontend
// instead of the plain-http ports whenever the GUI itself was loaded over
// https — required for microphone access on a non-localhost host.
const STUDIO_PORT_HTTPS = Number(process.env.PUBLIC_STUDIO_PORT_HTTPS || 0) || null;
const TTYD_PORT_HTTPS = Number(process.env.PUBLIC_TTYD_PORT_HTTPS || 0) || null;

// ---- helpers ---------------------------------------------------------------

const sseHead = (res) =>
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
const sse = (res, obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
const json = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch {
        resolve({});
      }
    });
  });

const readScenes = async () => JSON.parse(await readFile(SCENES_JSON, "utf8"));

const readVoiceSelection = async () => {
  try {
    return JSON.parse(await readFile(VOICE_SELECTION_FILE, "utf8"));
  } catch {
    return {};
  }
};
const writeVoiceSelection = async (sel) => {
  await mkdir(path.dirname(VOICE_SELECTION_FILE), { recursive: true });
  await writeFile(VOICE_SELECTION_FILE, JSON.stringify(sel));
};

// ---- automated pipeline: watch scenes.json, then voiceover + render -------
//
// There's no clean signal for "Claude CLI finished responding" (it's a bare
// interactive terminal — see claude-shell.sh), so the practical trigger is
// scenes.json itself changing. A short debounce absorbs multiple writes
// during one edit; a busy-guard queues at most one rerun if scenes.json
// changes again mid-run instead of overlapping pipeline runs.

const HISTORY_LIMIT = 20;
const pipelineHistory = [];
let current = null; // the in-progress/most-recent run, mirrored into history when it finishes
let pipelineBusy = false;
let rerunRequested = false;
let debounceTimer = null;

function newRun() {
  current = {
    id: Date.now(),
    status: "running", // running | done | error
    startedAt: Date.now(),
    finishedAt: null,
    stages: {
      script: { status: "done", detail: null },
      voiceover: { status: "pending", detail: null },
      render: { status: "pending", detail: null },
    },
    error: null,
    outputUrl: null,
  };
  return current;
}

function finishRun(status, error) {
  current.status = status;
  current.error = error || null;
  current.finishedAt = Date.now();
  pipelineHistory.unshift(current);
  if (pipelineHistory.length > HISTORY_LIMIT) pipelineHistory.length = HISTORY_LIMIT;
}

async function runPipeline() {
  const run = newRun();
  try {
    const { scenes } = await readScenes();
    run.stages.script.detail = `${scenes.length} scene(s)`;

    const sel = await readVoiceSelection();
    if (!sel.backend || !sel.voice) {
      run.stages.voiceover.status = "error";
      run.stages.voiceover.detail = "no voice selected — pick one in the Voiceover tab first";
      return finishRun("error", "no voice selected");
    }

    run.stages.voiceover.status = "running";
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      run.stages.voiceover.detail = `${i + 1}/${scenes.length} — ${s.id}`;
      await synthesize({
        backend: sel.backend,
        voice: sel.voice,
        text: s.narration,
        outMp3: path.join(VOICEOVER_DIR, `${s.id}.mp3`),
      });
    }
    run.stages.voiceover.status = "done";
    run.stages.voiceover.detail = `${scenes.length} clip(s) — ${sel.backend}/${sel.voice}`;

    run.stages.render.status = "running";
    const outFile = path.join("out", `${COMPOSITION_ID}.mp4`);
    await new Promise((resolve, reject) => {
      const proc = spawn("npx", ["remotion", "render", COMPOSITION_ID, outFile, "--log=info"], {
        cwd: REMOTION_DIR,
      });
      let err = "";
      const onData = (buf) => {
        const s = buf.toString();
        err += s;
        const m = s.match(/(\d+)\s*\/\s*(\d+)/);
        if (m) run.stages.render.detail = `${m[1]}/${m[2]} frames`;
      };
      proc.stdout.on("data", onData);
      proc.stderr.on("data", onData);
      proc.on("error", reject);
      proc.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`render exited ${code}: ${err.slice(-500)}`)),
      );
    });
    run.stages.render.status = "done";
    run.outputUrl = `/output/${COMPOSITION_ID}.mp4`;
    finishRun("done");
  } catch (e) {
    const stage = run.stages.voiceover.status === "running" ? "voiceover" : "render";
    run.stages[stage].status = "error";
    run.stages[stage].detail = e.message;
    finishRun("error", e.message);
  }
}

async function triggerPipeline() {
  if (pipelineBusy) {
    rerunRequested = true;
    return;
  }
  pipelineBusy = true;
  try {
    do {
      rerunRequested = false;
      await runPipeline();
    } while (rerunRequested);
  } finally {
    pipelineBusy = false;
  }
}

if (existsSync(SCENES_JSON)) {
  fsWatch(path.dirname(SCENES_JSON), (_event, filename) => {
    if (filename !== path.basename(SCENES_JSON)) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerPipeline, 4000);
  });
}

const CT = {
  ".html": "text/html",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".json": "application/json",
};

// ---- request handling ------------------------------------------------------

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    if (p === "/" || p === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(await readFile(path.join(__dirname, "public", "index.html")));
    }

    if (p === "/api/config") {
      // Prefer offline neural piper when its voice models are installed; fall
      // back to the cloud (if a key is set) and finally to robotic espeak.
      const piperVoices = (await listVoices("piper")).voices || [];
      const hasElevenKey = Boolean(process.env.ELEVENLABS_API_KEY);
      const defaultBackend =
        piperVoices.length > 0
          ? "piper"
          : hasElevenKey
            ? "elevenlabs"
            : "espeak";
      return json(res, 200, {
        compositionId: COMPOSITION_ID,
        studioPort: STUDIO_PORT,
        ttydPort: TTYD_PORT,
        studioPortHttps: STUDIO_PORT_HTTPS,
        ttydPortHttps: TTYD_PORT_HTTPS,
        hasElevenKey,
        backends: ["elevenlabs", "piper", "espeak", "xtts"],
        defaultBackend,
      });
    }

    if (p === "/api/voices") {
      const backend = url.searchParams.get("backend") || "elevenlabs";
      return json(res, 200, await listVoices(backend));
    }

    // ---- voice selection: the one manual choice the automated pipeline needs ----
    if (p === "/api/voice-selection" && req.method === "GET") {
      return json(res, 200, await readVoiceSelection());
    }
    if (p === "/api/voice-selection" && req.method === "POST") {
      const { backend, voice } = await readBody(req);
      if (!backend || !voice) return json(res, 400, { error: "backend and voice required" });
      await writeVoiceSelection({ backend, voice });
      return json(res, 200, { ok: true });
    }

    // ---- automated pipeline status: polled by the Progress tab ----
    if (p === "/api/pipeline/status") {
      return json(res, 200, { current, history: pipelineHistory });
    }

    // ---- xtts reference clip: upload a file OR an in-browser recording ----
    // Both a <input type="file">'s File and a MediaRecorder's Blob are valid
    // fetch() bodies, so this one raw-body route serves both.
    if (p === "/api/xtts/refs" && req.method === "POST") {
      const name = (url.searchParams.get("name") || "").replace(/[^a-zA-Z0-9_-]/g, "");
      if (!name) return json(res, 400, { error: "no name" });
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks);
      if (!raw.length) return json(res, 400, { error: "empty body" });
      await mkdir(VOICE_REFS_DIR, { recursive: true });
      const outWav = path.join(VOICE_REFS_DIR, `${name}.wav`);
      await new Promise((resolve, reject) => {
        // Normalize whatever codec came in (WebM/Opus from MediaRecorder, or
        // an arbitrary upload) to the 16kHz mono wav XTTS expects.
        const proc = spawn("ffmpeg", ["-y", "-i", "pipe:0", "-ar", "16000", "-ac", "1", outWav]);
        let err = "";
        proc.stderr.on("data", (d) => (err += d));
        proc.on("error", reject);
        proc.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err}`)),
        );
        proc.stdin.write(raw);
        proc.stdin.end();
      });
      return json(res, 200, { ok: true, id: `${name}.wav` });
    }

    // ---- scene script: read + save ----
    if (p === "/api/scenes" && req.method === "GET") {
      const data = await readScenes();
      return json(res, 200, { compositionId: data.compositionId, scenes: data.scenes });
    }
    if (p === "/api/scenes" && req.method === "POST") {
      const body = await readBody(req);
      if (!Array.isArray(body.scenes) || body.scenes.length === 0)
        return json(res, 400, { error: "scenes must be a non-empty array" });
      const data = await readScenes();
      data.scenes = body.scenes.map((s, i) => ({
        id: String(s.id || `${String(i + 1).padStart(2, "0")}-scene`),
        title: String(s.title || ""),
        body: String(s.body || ""),
        narration: String(s.narration || ""),
      }));
      await writeFile(SCENES_JSON, JSON.stringify(data, null, 2) + "\n");
      return json(res, 200, { ok: true, count: data.scenes.length });
    }

    if (p === "/api/output") {
      if (!existsSync(OUT_DIR)) return json(res, 200, { videos: [] });
      const files = (await readdir(OUT_DIR)).filter((f) => f.endsWith(".mp4"));
      const videos = await Promise.all(
        files.map(async (f) => {
          const s = await stat(path.join(OUT_DIR, f));
          return { name: f, size: s.size, mtime: s.mtimeMs };
        }),
      );
      return json(res, 200, { videos });
    }

    // Serve rendered videos from the (persistent-volume) output dir.
    if (p.startsWith("/output/")) {
      const file = path.join(OUT_DIR, path.basename(p));
      if (!existsSync(file)) return json(res, 404, { error: "not found" });
      const headers = { "Content-Type": CT[path.extname(file)] || "application/octet-stream" };
      if (url.searchParams.get("download"))
        headers["Content-Disposition"] = `attachment; filename="${path.basename(file)}"`;
      res.writeHead(200, headers);
      return res.end(await readFile(file));
    }

    // ---- voice preview (short sample) ----
    if (p === "/api/preview" && req.method === "POST") {
      const { backend = "elevenlabs", voice } = await readBody(req);
      if (!voice) return json(res, 400, { error: "no voice" });
      const tmp = path.join(os.tmpdir(), `preview-${Date.now()}.mp3`);
      try {
        await synthesize({
          backend,
          voice,
          text: "Hi! This is a preview of the selected voice for your video.",
          outMp3: tmp,
        });
        res.writeHead(200, { "Content-Type": "audio/mpeg" });
        return res.end(await readFile(tmp));
      } catch (e) {
        return json(res, 500, { error: e.message });
      }
    }

    // ---- voiceover generation (SSE) ----
    if (p === "/api/voiceover" && req.method === "POST") {
      const { backend = "elevenlabs", voice } = await readBody(req);
      sseHead(res);
      if (!voice) {
        sse(res, { type: "error", error: "no voice selected" });
        return res.end();
      }
      const { scenes } = await readScenes();
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        sse(res, { type: "progress", i, total: scenes.length, id: s.id, stage: "start" });
        try {
          await synthesize({
            backend,
            voice,
            text: s.narration,
            outMp3: path.join(VOICEOVER_DIR, `${s.id}.mp3`),
          });
          sse(res, { type: "progress", i, total: scenes.length, id: s.id, stage: "done" });
        } catch (e) {
          sse(res, { type: "error", id: s.id, error: e.message });
          return res.end();
        }
      }
      sse(res, { type: "done", count: scenes.length });
      return res.end();
    }

    // ---- render (SSE) ----
    if (p === "/api/render" && req.method === "POST") {
      sseHead(res);
      const outFile = path.join("out", `${COMPOSITION_ID}.mp4`);
      const proc = spawn(
        "npx",
        ["remotion", "render", COMPOSITION_ID, outFile, "--log=info"],
        { cwd: REMOTION_DIR },
      );
      const onData = (buf) => {
        for (const line of buf.toString().split(/\r?\n/)) {
          const m = line.match(/(\d+)\s*\/\s*(\d+)/);
          if (m) {
            const done = Number(m[1]),
              total = Number(m[2]);
            if (total > 0)
              sse(res, {
                type: "progress",
                pct: Math.round((done / total) * 100),
                done,
                total,
              });
          }
        }
      };
      proc.stdout.on("data", onData);
      proc.stderr.on("data", onData);
      proc.on("close", (code) => {
        if (code === 0) sse(res, { type: "done", url: `/output/${COMPOSITION_ID}.mp4` });
        else sse(res, { type: "error", error: `render exited ${code}` });
        res.end();
      });
      req.on("close", () => proc.kill());
      return;
    }

    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

server.listen(PORT, "0.0.0.0", () =>
  console.log(`AI Video Creator GUI on http://0.0.0.0:${PORT}`),
);
