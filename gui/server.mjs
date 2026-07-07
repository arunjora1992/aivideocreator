// AI Video Creator — GUI server (zero external deps, Node built-ins only).
//
// Tabs served by the single-page UI:
//   1. Studio    — iframe to Remotion Studio (render/preview page)      :3000
//   2. Claude    — iframe to a ttyd web terminal running the claude CLI :7681
//   3. Script    — edit each scene (title / body / narration) + generate voiceover
//   4. Render    — render the MP4, watch live progress, play + download outputs
import { createServer } from "node:http";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { listVoices, synthesize } from "./lib/tts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REMOTION_DIR = path.join(ROOT, "remotion");
const COMPOSITION_ID = process.env.COMPOSITION_ID || "starter";
const SCENES_JSON = path.join(REMOTION_DIR, "src", "starter", "scenes.json");
const VOICEOVER_DIR = path.join(REMOTION_DIR, "public", "voiceover", COMPOSITION_ID);
const OUT_DIR = path.join(REMOTION_DIR, "out");

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
      return json(res, 200, {
        compositionId: COMPOSITION_ID,
        studioPort: STUDIO_PORT,
        ttydPort: TTYD_PORT,
        hasElevenKey: Boolean(process.env.ELEVENLABS_API_KEY),
        backends: ["elevenlabs", "piper", "espeak"],
      });
    }

    if (p === "/api/voices") {
      const backend = url.searchParams.get("backend") || "elevenlabs";
      return json(res, 200, await listVoices(backend));
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
