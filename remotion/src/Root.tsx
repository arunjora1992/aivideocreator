import "./index.css";
import { Composition, getStaticFiles } from "remotion";
import { AIVideo, aiVideoSchema } from "./components/AIVideo";
import { FPS, INTRO_DURATION } from "./lib/constants";
import { getTimelinePath, loadTimelineFromFile } from "./lib/utils";
import {
  calculateIntegrationMetadata,
  IntegrationVideo,
  integrationSchema,
} from "./integration/IntegrationVideo";
import { COMPOSITION_ID } from "./integration/scenes";
import { VIDEO } from "./integration/theme";

export const RemotionRoot: React.FC = () => {
  const staticFiles = getStaticFiles();
  const timelines = staticFiles
    .filter((file) => file.name.endsWith("timeline.json"))
    .map((file) => file.name.split("/")[1]);

  return (
    <>
      <Composition
        id={COMPOSITION_ID}
        component={IntegrationVideo}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
        schema={integrationSchema}
        defaultProps={{ sceneTimings: [] }}
        calculateMetadata={calculateIntegrationMetadata}
      />
      {timelines.map((storyName) => (
        <Composition
          id={storyName}
          component={AIVideo}
          fps={FPS}
          width={1080}
          height={1920}
          schema={aiVideoSchema}
          defaultProps={{
            timeline: null,
          }}
          calculateMetadata={async ({ props }) => {
            const { lengthFrames, timeline } = await loadTimelineFromFile(
              getTimelinePath(storyName),
            );

            return {
              durationInFrames: lengthFrames + INTRO_DURATION,
              props: {
                ...props,
                timeline,
              },
            };
          }}
        />
      ))}
    </>
  );
};
