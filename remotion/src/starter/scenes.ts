// The "project" the GUI edits. Content lives in scenes.json so the GUI can
// read/write it as plain data; this module gives it types + the video config.
import data from "./scenes.json";

export interface Scene {
  id: string;
  title: string;
  body: string;
  narration: string;
}

export const COMPOSITION_ID: string = data.compositionId;

export const VIDEO = {
  width: data.width,
  height: data.height,
  fps: data.fps,
};

export const SCENES: Scene[] = data.scenes;
