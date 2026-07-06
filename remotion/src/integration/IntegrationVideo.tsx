import React from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  CalculateMetadataFunction,
  Sequence,
  staticFile,
} from "remotion";
import { z } from "zod";
import { Background } from "./components/Background";
import {
  estimateNarrationSeconds,
  tryGetAudioDuration,
} from "./lib/audioDuration";
import { COMPOSITION_ID, SCENES } from "./scenes";
import { SCENE_COMPONENTS } from "./scenes/registry";
import { VIDEO } from "./theme";

// Extra breathing room after each narration line before the next scene.
const TAIL_SECONDS = 0.5;

const sceneTimingSchema = z.object({
  frames: z.number(),
  hasAudio: z.boolean(),
});

export const integrationSchema = z.object({
  sceneTimings: z.array(sceneTimingSchema),
});

export type IntegrationProps = z.infer<typeof integrationSchema>;

export const audioSrc = (sceneId: string) =>
  `voiceover/${COMPOSITION_ID}/${sceneId}.mp3`;

export const calculateIntegrationMetadata: CalculateMetadataFunction<
  IntegrationProps
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
      return {
        frames: Math.ceil(seconds * fps),
        hasAudio,
      };
    }),
  );

  const durationInFrames = sceneTimings.reduce((sum, s) => sum + s.frames, 0);

  return {
    durationInFrames,
    fps,
    width: VIDEO.width,
    height: VIDEO.height,
    props: { sceneTimings },
  };
};

export const IntegrationVideo: React.FC<IntegrationProps> = ({
  sceneTimings,
}) => {
  // Fallback so the component still renders in Studio before metadata resolves.
  const timings =
    sceneTimings.length === SCENES.length
      ? sceneTimings
      : SCENES.map(() => ({ frames: 3 * VIDEO.fps, hasAudio: false }));

  let cursor = 0;

  return (
    <AbsoluteFill>
      <Background />
      {SCENES.map((scene, i) => {
        const { frames, hasAudio } = timings[i];
        const from = cursor;
        cursor += frames;
        const SceneComponent = SCENE_COMPONENTS[scene.kind];

        return (
          <Sequence
            key={scene.id}
            from={from}
            durationInFrames={frames}
            name={scene.id}
          >
            {hasAudio ? <Audio src={staticFile(audioSrc(scene.id))} /> : null}
            <SceneComponent
              durationInFrames={frames}
              caption={scene.narration}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
