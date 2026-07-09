// Optional "talking head" stage — a presenter photo (uploaded once) + a
// scene's already-generated narration mp3 in, a talking-head mp4 clip out.
// Entirely optional: if no photo has been uploaded, the pipeline skips this
// stage and scenes render as plain text/motion-graphics, same as before
// this feature existed.
//
// Two swappable engines, picked via AVATAR_ENGINE (default "wav2lip"):
//   - wav2lip : CPU-feasible, mouth-only lip-sync on the static photo.
//               Runs on this repo's default (non-GPU) setup.
//   - hallo   : GPU-only diffusion model (fudan-generative-vision/hallo),
//               photorealistic head motion, not just mouth sync. Requires
//               docker-compose.gpu.yml on a CUDA-capable host — some of its
//               ops have no CPU fallback at all.
import { existsSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

export const PRESENTER_DIR = process.env.PRESENTER_DIR || "/app/remotion/public/presenter";
export const PRESENTER_PHOTO = path.join(PRESENTER_DIR, "photo.jpg");
const AVATAR_DIR_BASE = process.env.AVATAR_DIR || "/app/remotion/public/avatar";
const AVATAR_ENGINE = process.env.AVATAR_ENGINE || "wav2lip";

const WAV2LIP_URL = process.env.WAV2LIP_URL || "http://wav2lip:8092";
const HALLO_URL = process.env.HALLO_URL || "http://hallo:8093";
// Same volumes, as each engine's container sees them (docker-compose.yml /
// docker-compose.gpu.yml mount them there) — paths sent over HTTP to an
// engine must use these, not the GUI-side dirs above.
const WAV2LIP_PRESENTER_MOUNT = process.env.WAV2LIP_PRESENTER_MOUNT || "/presenter";
const WAV2LIP_AVATAR_MOUNT = process.env.WAV2LIP_AVATAR_MOUNT || "/avatar_out";
const WAV2LIP_AUDIO_MOUNT = process.env.WAV2LIP_AUDIO_MOUNT || "/voiceover_audio";
const HALLO_PRESENTER_MOUNT = process.env.HALLO_PRESENTER_MOUNT || "/presenter";
const HALLO_AVATAR_MOUNT = process.env.HALLO_AVATAR_MOUNT || "/avatar_out";
const HALLO_AUDIO_MOUNT = process.env.HALLO_AUDIO_MOUNT || "/voiceover_audio";

export function hasPresenterPhoto() {
  return existsSync(PRESENTER_PHOTO);
}

export function avatarClipPath(compositionId, sceneId) {
  return path.join(AVATAR_DIR_BASE, compositionId, `${sceneId}.mp4`);
}

async function callEngine(url, { facePath, audioPath, outVideo }) {
  const res = await fetch(`${url}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ facePath, audioPath, outVideo }),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}: ${await res.text()}`);
}

// Crops/scales the generated clip to the composition's exact dimensions.
// Both engines' raw output keeps the source photo's aspect ratio (often
// portrait), but Remotion's <Video> from @remotion/media doesn't honor
// objectFit — it always fits-contain, so a mismatched aspect ratio would
// show as letterbox/pillarbox bars without this.
async function cropToFit(outLocal, width, height) {
  if (!width || !height) return;
  const cropped = `${outLocal}.cropped.mp4`;
  await new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", [
      "-y", "-i", outLocal,
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
      cropped,
    ]);
    let err = "";
    proc.stderr.on("data", (d) => (err += d));
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg crop exited ${code}: ${err.slice(-500)}`)),
    );
  });
  await rename(cropped, outLocal);
}

export async function generateAvatarClip({ compositionId, sceneId, width, height }) {
  const outLocal = avatarClipPath(compositionId, sceneId);
  await mkdir(path.dirname(outLocal), { recursive: true });

  if (AVATAR_ENGINE === "hallo") {
    await callEngine(HALLO_URL, {
      facePath: path.posix.join(HALLO_PRESENTER_MOUNT, "photo.jpg"),
      audioPath: path.posix.join(HALLO_AUDIO_MOUNT, compositionId, `${sceneId}.mp3`),
      outVideo: path.posix.join(HALLO_AVATAR_MOUNT, compositionId, `${sceneId}.mp4`),
    });
  } else {
    await callEngine(WAV2LIP_URL, {
      facePath: path.posix.join(WAV2LIP_PRESENTER_MOUNT, "photo.jpg"),
      audioPath: path.posix.join(WAV2LIP_AUDIO_MOUNT, compositionId, `${sceneId}.mp3`),
      outVideo: path.posix.join(WAV2LIP_AVATAR_MOUNT, compositionId, `${sceneId}.mp4`),
    });
  }

  await cropToFit(outLocal, width, height);
}
