import React from "react";
import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  staticFile,
} from "remotion";
import { z } from "zod";
import { tryGetAudioDuration, estimateNarrationSeconds } from "./audioDuration";
import { COMPOSITION_ID, SCENES, VIDEO } from "./scenes";
import { Scene } from "./Scene";

const TAIL_SECONDS = 0.5;

const sceneTimingSchema = z.object({
  frames: z.number(),
  hasAudio: z.boolean(),
  hasAvatar: z.boolean(),
});

export const starterSchema = z.object({
  sceneTimings: z.array(sceneTimingSchema),
});

export type StarterProps = z.infer<typeof starterSchema>;

export const audioSrc = (sceneId: string) =>
  `voiceover/${COMPOSITION_ID}/${sceneId}.mp3`;

// Present only when a presenter photo has been uploaded and the automated
// pipeline's optional avatar stage generated a lip-synced clip for this
// scene — see gui/lib/avatar.mjs. Absent, scenes render as plain
// text/motion-graphics (unchanged from before this feature existed).
export const avatarSrc = (sceneId: string) =>
  `avatar/${COMPOSITION_ID}/${sceneId}.mp4`;

export const calculateStarterMetadata: CalculateMetadataFunction<
  StarterProps
> = async () => {
  const { fps } = VIDEO;
  const sceneTimings = await Promise.all(
    SCENES.map(async (scene) => {
      const audioSeconds = await tryGetAudioDuration(
        staticFile(audioSrc(scene.id)),
      );
      const hasAudio = audioSeconds !== null;
      const hasAvatar =
        (await tryGetAudioDuration(staticFile(avatarSrc(scene.id)))) !== null;
      const seconds =
        (audioSeconds ?? estimateNarrationSeconds(scene.narration)) +
        TAIL_SECONDS;
      return { frames: Math.ceil(seconds * fps), hasAudio, hasAvatar };
    }),
  );

  return {
    durationInFrames: sceneTimings.reduce((s, t) => s + t.frames, 0),
    fps,
    width: VIDEO.width,
    height: VIDEO.height,
    props: { sceneTimings },
  };
};

export const StarterVideo: React.FC<StarterProps> = ({ sceneTimings }) => {
  const timings =
    sceneTimings.length === SCENES.length
      ? sceneTimings
      : SCENES.map(() => ({ frames: 3 * VIDEO.fps, hasAudio: false, hasAvatar: false }));

  let cursor = 0;
  return (
    <AbsoluteFill>
      {SCENES.map((scene, i) => {
        const { frames, hasAudio, hasAvatar } = timings[i];
        const from = cursor;
        cursor += frames;
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={frames}
            name={scene.id}
          >
            {hasAvatar ? (
              // The avatar clip already carries the narration audio muxed
              // in (Wav2Lip's output), so it replaces <Audio> entirely —
              // playing both would double up the narration.
              <Video
                src={staticFile(avatarSrc(scene.id))}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : hasAudio ? (
              <Audio src={staticFile(audioSrc(scene.id))} />
            ) : null}
            <Scene scene={scene} durationInFrames={frames} hasAvatar={hasAvatar} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
