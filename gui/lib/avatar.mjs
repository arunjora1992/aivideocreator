// Optional CPU lip-sync ("talking head") stage — a presenter photo (uploaded
// once) + a scene's already-generated narration mp3 in, a talking-head mp4
// clip out, via the standalone wav2lip service. Entirely optional: if no
// photo has been uploaded, the pipeline skips this stage and scenes render
// as plain text/motion-graphics, same as before this feature existed.
import { existsSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

export const PRESENTER_DIR = process.env.PRESENTER_DIR || "/app/remotion/public/presenter";
export const PRESENTER_PHOTO = path.join(PRESENTER_DIR, "photo.jpg");
const AVATAR_DIR_BASE = process.env.AVATAR_DIR || "/app/remotion/public/avatar";

const WAV2LIP_URL = process.env.WAV2LIP_URL || "http://wav2lip:8092";
// Same volumes, as the wav2lip container sees them (docker-compose.yml mounts
// them there) — paths sent over HTTP to wav2lip must use these, not the
// GUI-side dirs above.
const WAV2LIP_PRESENTER_MOUNT = process.env.WAV2LIP_PRESENTER_MOUNT || "/presenter";
const WAV2LIP_AVATAR_MOUNT = process.env.WAV2LIP_AVATAR_MOUNT || "/avatar_out";
const WAV2LIP_AUDIO_MOUNT = process.env.WAV2LIP_AUDIO_MOUNT || "/voiceover_audio";

export function hasPresenterPhoto() {
  return existsSync(PRESENTER_PHOTO);
}

export function avatarClipPath(compositionId, sceneId) {
  return path.join(AVATAR_DIR_BASE, compositionId, `${sceneId}.mp4`);
}

export async function generateAvatarClip({ compositionId, sceneId, width, height }) {
  const outLocal = avatarClipPath(compositionId, sceneId);
  await mkdir(path.dirname(outLocal), { recursive: true });

  const body = JSON.stringify({
    facePath: path.posix.join(WAV2LIP_PRESENTER_MOUNT, "photo.jpg"),
    audioPath: path.posix.join(WAV2LIP_AUDIO_MOUNT, compositionId, `${sceneId}.mp3`),
    outVideo: path.posix.join(WAV2LIP_AVATAR_MOUNT, compositionId, `${sceneId}.mp4`),
  });
  const res = await fetch(`${WAV2LIP_URL}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`wav2lip ${res.status}: ${await res.text()}`);

  // Wav2Lip's output keeps the source photo's aspect ratio (e.g. portrait),
  // but Remotion's <Video> from @remotion/media doesn't honor objectFit —
  // it always fits-contain, so a mismatched aspect ratio shows as
  // letterbox/pillarbox bars. Crop-and-scale to the composition's exact
  // dimensions here so it always fills the frame.
  if (width && height) {
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
}
