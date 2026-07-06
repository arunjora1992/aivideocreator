// AI Video Creator — GUI server (zero external deps, Node built-ins only).
//
// Tabs served by the single-page UI:
//   1. Studio   — iframe to Remotion Studio (render/preview page)      :3000
//   2. Claude   — iframe to a ttyd web terminal running the claude CLI :7681
//   3. Voiceover— pick backend + voice, (re)generate narration MP3s
//   4. Render   — kick off an MP4 render, watch live progress, download
import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listVoices, synthesize } from "./lib/tts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REMOTION_DIR = path.join(ROOT, "remotion");
const COMPOSITION_ID = process.env.COMPOSITION_ID || "identity-integration";
const VOICEOVER_DIR = path.join(
  REMOTION_DIR,
  "public",
  "voiceover",
  COMPOSITION_ID,
);
const OUT_DIR = path.join(REMOTION_DIR, "out");

const PORT = Number(process.env.GUI_PORT || 8080);
const STUDIO_PORT = Number(process.env.STUDIO_PORT || 3000);
const TTYD_PORT = Number(process.env.TTYD_PORT || 7681);

// ---- helpers ---------------------------------------------------------------

const sseHead = (res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
};
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

const getScenes = () =>
  new Promise((resolve, reject) => {
    const p = spawn("npx", ["tsx", "scripts/dump-scenes.ts"], {
      cwd: REMOTION_DIR,
    });
    let out = "",
      err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(err || `dump-scenes exited ${code}`));
      try {
        resolve(JSON.parse(out.trim().split("\n").pop()));
      } catch (e) {
        reject(new Error(`bad scenes JSON: ${e.message}`));
      }
    });
  });

const CONTENT_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".mp4": "video/mp4",
  ".json": "application/json",
};

// ---- request handling ------------------------------------------------------

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  try {
    if (p === "/" || p === "/index.html") {
      const html = await readFile(path.join(__dirname, "public", "index.html"));
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(html);
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

    if (p === "/api/scenes") {
      try {
        return json(res, 200, { scenes: await getScenes() });
      } catch (e) {
        return json(res, 500, { error: e.message });
      }
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
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": CONTENT_TYPES[path.extname(file)] || "application/octet-stream",
      });
      return res.end(data);
    }

    // ---- voiceover generation (SSE) ----
    if (p === "/api/voiceover" && req.method === "POST") {
      const { backend = "elevenlabs", voice } = await readBody(req);
      sseHead(res);
      if (!voice) {
        sse(res, { type: "error", error: "no voice selected" });
        return res.end();
      }
      let scenes;
      try {
        scenes = await getScenes();
      } catch (e) {
        sse(res, { type: "error", error: `cannot load scenes: ${e.message}` });
        return res.end();
      }
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
        const text = buf.toString();
        for (const line of text.split(/\r?\n/)) {
          const m = line.match(/(\d+)\s*\/\s*(\d+)/);
          if (m) {
            const done = Number(m[1]),
              total = Number(m[2]);
            if (total > 0)
              sse(res, { type: "progress", pct: Math.round((done / total) * 100), done, total });
          }
        }
      };
      proc.stdout.on("data", onData);
      proc.stderr.on("data", onData);
      proc.on("close", (code) => {
        if (code === 0)
          sse(res, { type: "done", url: `/output/${COMPOSITION_ID}.mp4` });
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
