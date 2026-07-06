// Multi-backend text-to-speech for the AI Video Creator GUI.
//
// Backends:
//   - elevenlabs : ElevenLabs cloud TTS (needs ELEVENLABS_API_KEY). Best quality.
//   - piper      : offline neural TTS (piper binary + .onnx voice). No API key.
//   - espeak     : offline formant TTS (espeak-ng). Always available, robotic.
//
// All backends ultimately write an MP3 (wav is converted with ffmpeg) so the
// Remotion composition can consume it unchanged.
import { spawn } from "node:child_process";
import { writeFile, readdir, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const PIPER_VOICES_DIR = process.env.PIPER_VOICES_DIR || "/opt/piper/voices";

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
    // A curated subset; espeak-ng ships dozens of language voices.
    return {
      voices: [
        { id: "en-us", name: "English (US)" },
        { id: "en-gb", name: "English (UK)" },
        { id: "en-us+m3", name: "English (US) — male" },
        { id: "en-us+f3", name: "English (US) — female" },
      ],
    };
  }
  return { error: `unknown backend ${backend}` };
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
    } else {
      throw new Error(`unknown backend ${backend}`);
    }
    await wavToMp3(tmpWav, outMp3);
  } finally {
    await rm(tmpWav, { force: true });
  }
}
