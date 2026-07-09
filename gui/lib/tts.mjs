// Multi-backend text-to-speech for the AI Video Creator GUI.
//
// Backends:
//   - elevenlabs : ElevenLabs cloud TTS (needs ELEVENLABS_API_KEY). Best quality.
//   - piper      : offline neural TTS (piper binary + .onnx voice). No API key.
//   - espeak     : offline formant TTS (espeak-ng). Always available, robotic.
//   - xtts       : offline CPU voice cloning (Coqui XTTS-v2), runs in its own
//                  container reached over HTTP at XTTS_URL. `voice` is the
//                  filename of a reference clip recorded/uploaded via the GUI.
//
// All backends ultimately write an MP3 (wav is converted with ffmpeg) so the
// Remotion composition can consume it unchanged.
import { spawn } from "node:child_process";
import { writeFile, readdir, mkdir, rm, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const PIPER_VOICES_DIR = process.env.PIPER_VOICES_DIR || "/opt/piper/voices";
// Reference voice clips, on a volume shared with the xtts container.
export const VOICE_REFS_DIR =
  process.env.VOICE_REFS_DIR || "/app/remotion/public/voiceover_refs";
// Same volume, as the xtts container sees it (docker-compose.yml mounts it
// there) — paths sent over HTTP to xtts must use this, not VOICE_REFS_DIR.
const XTTS_REFS_MOUNT = process.env.XTTS_REFS_MOUNT || "/refs";
const XTTS_URL = process.env.XTTS_URL || "http://xtts:8091";

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, opts);
    let err = "";
    p.stderr?.on("data", (d) => (err += d));
    if (opts.stdin != null) {
      p.stdin.write(opts.stdin);
      p.stdin.end();
    }
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err}`)),
    );
  });

const runCapture = (cmd, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${err}`)),
    );
  });

const wavToMp3 = async (wav, mp3) => {
  await run("ffmpeg", ["-y", "-i", wav, "-codec:a", "libmp3lame", "-qscale:a", "4", mp3]);
};

// ---- voice listing ---------------------------------------------------------

export async function listVoices(backend) {
  if (backend === "elevenlabs") {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) return { error: "ELEVENLABS_API_KEY not set" };
    const res = await fetch("https://api.elevenlabs.io/v2/voices?page_size=100", {
      headers: { "xi-api-key": key },
    });
    if (!res.ok) return { error: `ElevenLabs ${res.status}: ${await res.text()}` };
    const json = await res.json();
    return {
      voices: (json.voices || []).map((v) => ({
        id: v.voice_id,
        name: `${v.name}${v.category ? ` (${v.category})` : ""}`,
      })),
    };
  }
  if (backend === "piper") {
    if (!existsSync(PIPER_VOICES_DIR)) return { voices: [] };
    const files = (await readdir(PIPER_VOICES_DIR)).filter((f) => f.endsWith(".onnx"));
    return { voices: files.map((f) => ({ id: f, name: f.replace(/\.onnx$/, "") })) };
  }
  if (backend === "espeak") {
    // Every language espeak-ng ships, queried live rather than hardcoded —
    // `espeak-ng --voices` output looks like:
    //   Pty Language  Age/Gender VoiceName  File  Other Languages
    //    5  ta         --/M      Tamil      dra/ta
    const out = await runCapture("espeak-ng", ["--voices"]);
    const voices = out
      .split("\n")
      .slice(1)
      .map((line) => line.match(/^\s*\d+\s+(\S+)\s+\S+\s+(\S+)/))
      .filter(Boolean)
      .map(([, lang, name]) => ({ id: lang, name: `${name.replace(/_/g, " ")} (${lang})` }));
    return { voices };
  }
  if (backend === "xtts") {
    if (!existsSync(VOICE_REFS_DIR)) return { voices: [] };
    const files = (await readdir(VOICE_REFS_DIR)).filter((f) => f.endsWith(".wav"));
    return { voices: files.map((f) => ({ id: f, name: f.replace(/\.wav$/, "") })) };
  }
  return { error: `unknown backend ${backend}` };
}

// ---- xtts voice cloning: call the standalone container over HTTP ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function synthesizeXtts({ voice, text, tmpWav }) {
  // Shared-volume scratch file: GUI and xtts containers mount the same
  // volume at different paths (VOICE_REFS_DIR vs XTTS_REFS_MOUNT), so the
  // xtts container is told to write using its own mount prefix.
  const scratchName = `_xtts-${process.pid}-${Date.now()}.wav`;
  const sharedOut = path.join(VOICE_REFS_DIR, scratchName);
  const body = JSON.stringify({
    text,
    refAudioPath: path.posix.join(XTTS_REFS_MOUNT, voice),
    outWav: path.posix.join(XTTS_REFS_MOUNT, scratchName),
  });

  const deadline = Date.now() + 90_000;
  for (;;) {
    const res = await fetch(`${XTTS_URL}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (res.status === 503) {
      if (Date.now() > deadline) throw new Error("xtts model still warming up after 90s");
      await sleep(2000);
      continue;
    }
    if (!res.ok) throw new Error(`xtts ${res.status}: ${await res.text()}`);
    break;
  }

  try {
    await copyFile(sharedOut, tmpWav);
  } finally {
    await rm(sharedOut, { force: true });
  }
}

// ---- synthesis of a single line -------------------------------------------

export async function synthesize({ backend, voice, text, outMp3 }) {
  await mkdir(path.dirname(outMp3), { recursive: true });

  if (backend === "elevenlabs") {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) throw new Error("ELEVENLABS_API_KEY not set");
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.15 },
        }),
      },
    );
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
    await writeFile(outMp3, Buffer.from(await res.arrayBuffer()));
    return;
  }

  const tmpWav = path.join(os.tmpdir(), `tts-${process.pid}-${Date.now()}.wav`);
  try {
    if (backend === "piper") {
      const model = path.join(PIPER_VOICES_DIR, voice);
      if (!existsSync(model)) throw new Error(`piper voice not found: ${voice}`);
      await run("piper", ["--model", model, "--output_file", tmpWav], { stdin: text });
    } else if (backend === "espeak") {
      await run("espeak-ng", ["-v", voice, "-w", tmpWav, text]);
    } else if (backend === "xtts") {
      if (!existsSync(path.join(VOICE_REFS_DIR, voice)))
        throw new Error(`xtts reference clip not found: ${voice}`);
      await synthesizeXtts({ voice, text, tmpWav });
    } else {
      throw new Error(`unknown backend ${backend}`);
    }
    await wavToMp3(tmpWav, outMp3);
  } finally {
    await rm(tmpWav, { force: true });
  }
}
