import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/RobotoMono";

const { fontFamily: sans } = loadInter();
const { fontFamily: mono } = loadMono();

export const FONT = { sans, mono };

export const COLORS = {
  bg: "#F5F7FB",
  bgGlow: "#DCE7FA",
  panel: "#FFFFFF",
  border: "#D6DEEC",
  text: "#12203A",
  muted: "#5A6B87",
  accent: "#1E6FD6",
};
