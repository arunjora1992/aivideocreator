import React from "react";
import { Audio } from "@remotion/media";
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
});

export const starterSchema = z.object({
  sceneTimings: z.array(sceneTimingSchema),
});

export type StarterProps = z.infer<typeof starterSchema>;

export const audioSrc = (sceneId: string) =>
  `voiceover/${COMPOSITION_ID}/${sceneId}.mp3`;

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
      const seconds =
        (audioSeconds ?? estimateNarrationSeconds(scene.narration)) +
        TAIL_SECONDS;
      return { frames: Math.ceil(seconds * fps), hasAudio };
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
      : SCENES.map(() => ({ frames: 3 * VIDEO.fps, hasAudio: false }));

  let cursor = 0;
  return (
    <AbsoluteFill>
      {SCENES.map((scene, i) => {
        const { frames, hasAudio } = timings[i];
        const from = cursor;
        cursor += frames;
        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={frames}
            name={scene.id}
          >
            {hasAudio ? <Audio src={staticFile(audioSrc(scene.id))} /> : null}
            <Scene scene={scene} durationInFrames={frames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
