import "./index.css";
import { Composition } from "remotion";
import {
  calculateStarterMetadata,
  StarterVideo,
  starterSchema,
} from "./starter/StarterVideo";
import { COMPOSITION_ID, VIDEO } from "./starter/scenes";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={COMPOSITION_ID}
      component={StarterVideo}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      schema={starterSchema}
      defaultProps={{ sceneTimings: [] }}
      calculateMetadata={calculateStarterMetadata}
    />
  );
};
