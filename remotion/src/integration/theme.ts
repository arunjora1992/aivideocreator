import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/RobotoMono";

const { fontFamily: sans } = loadInter();
const { fontFamily: mono } = loadMono();

export const FONT = {
  sans,
  mono,
};

// Landscape 16:9 — diagrams and horizontal auth flows read best here.
export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
};

export const COLORS = {
  bg: "#F5F7FB",
  bgGlow: "#DCE7FA",
  panel: "#FFFFFF",
  panelBorder: "#D6DEEC",
  grid: "rgba(30,50,90,0.06)",
  text: "#12203A",
  textMuted: "#5A6B87",
  keycloak: "#1E6FD6",
  freeipa: "#D23B2E",
  google: "#4285F4",
  token: "#0E9F6E",
  app: "#7C3AED",
  user: "#D97706",
  arrow: "#7488A8",
};

// Google's four brand colors, used for the "G" mark and accents.
export const GOOGLE_COLORS = {
  blue: "#4285F4",
  red: "#EA4335",
  yellow: "#FBBC05",
  green: "#34A853",
};
