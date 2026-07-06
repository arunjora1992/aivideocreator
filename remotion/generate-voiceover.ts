/**
 * Generate per-scene voiceover MP3s for the "identity-integration" video with
 * ElevenLabs TTS.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=... npx tsx generate-voiceover.ts
 *   (or put the key in .env — it is loaded automatically)
 *
 * Optional flags:
 *   --voice <voiceId>   ElevenLabs voice id (default: Rachel)
 *   --force             re-generate files that already exist
 *
 * Output: public/voiceover/identity-integration/<scene-id>.mp3
 * Once generated, calculateMetadata() picks up the real durations and the audio
 * plays automatically — no other change needed.
 */
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { COMPOSITION_ID, SCENES } from "./src/integration/scenes";

dotenv.config({ quiet: true });

const argv = process.argv.slice(2);
const getFlag = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const force = argv.includes("--force");
// George — "Warm, Captivating Storyteller"; a default voice usable on free
// plans. Override with --voice <id>. (Library voices need a paid plan.)
const voiceId = getFlag("voice") ?? "JBFqnCBsd6RMkjVDRZzb";
const modelId = "eleven_multilingual_v2";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing ELEVENLABS_API_KEY. Set it in .env or pass it inline.",
    );
    process.exit(1);
  }

  const client = new ElevenLabsClient({
    environment: "https://api.elevenlabs.io",
    apiKey,
  });

  const outDir = path.join(
    process.cwd(),
    "public",
    "voiceover",
    COMPOSITION_ID,
  );
  fs.mkdirSync(outDir, { recursive: true });

  console.log(
    `Generating ${SCENES.length} voiceover clips (voice=${voiceId})...\n`,
  );

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    const outPath = path.join(outDir, `${scene.id}.mp3`);
    const tag = `[${i + 1}/${SCENES.length}] ${scene.id}`;

    if (fs.existsSync(outPath) && !force) {
      console.log(`${tag} — exists, skipping (use --force to overwrite)`);
      continue;
    }

    process.stdout.write(`${tag} — synthesizing... `);
    const data = await client.textToSpeech.convertWithTimestamps(voiceId, {
      text: scene.narration,
      modelId,
      voiceSettings: {
        stability: 0.45,
        similarityBoost: 0.75,
        style: 0.15,
      },
    });

    const buffer = Buffer.from(data.audioBase64, "base64");
    fs.writeFileSync(outPath, buffer as Uint8Array);
    console.log(`saved (${(buffer.length / 1024).toFixed(0)} KB)`);
  }

  console.log(
    `\nDone. Files written to public/voiceover/${COMPOSITION_ID}/`,
  );
  console.log("Preview with:  npx remotion studio");
}

main().catch((err) => {
  console.error("\nError:", err);
  process.exit(1);
});
