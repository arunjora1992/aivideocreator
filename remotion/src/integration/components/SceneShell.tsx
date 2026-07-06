import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";

// Shared scene chrome: fades the whole scene in/out at its edges,
// renders an optional kicker/heading at the top, and the narration
// caption band at the bottom. The `durationInFrames` is the length of
// this scene's own <Sequence>, so frame 0 == scene start.
export const SceneShell: React.FC<{
  durationInFrames: number;
  kicker?: string;
  heading?: string;
  caption: string;
  children: React.ReactNode;
}> = ({ durationInFrames, kicker, heading, caption, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 0.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 0.35 * fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Header */}
      {heading || kicker ? (
        <div
          style={{
            position: "absolute",
            top: 84,
            left: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "0 120px",
          }}
        >
          {kicker ? (
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 24,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: COLORS.textMuted,
              }}
            >
              {kicker}
            </div>
          ) : null}
          {heading ? (
            <div
              style={{
                fontFamily: FONT.sans,
                fontSize: 72,
                fontWeight: 800,
                color: COLORS.text,
                textAlign: "center",
                lineHeight: 1.05,
              }}
            >
              {heading}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Scene content */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: heading ? "220px 120px 310px" : "120px 120px 290px",
        }}
      >
        {children}
      </AbsoluteFill>

      {/* Caption band */}
      <CaptionBar text={caption} />
    </AbsoluteFill>
  );
};

const CaptionBar: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: "50%",
        transform: "translateX(-50%)",
        width: 1360,
        maxWidth: "90%",
        padding: "18px 44px",
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.94)",
        border: `1px solid ${COLORS.panelBorder}`,
        boxShadow: "0 12px 34px rgba(20, 40, 80, 0.14)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 40,
          fontWeight: 500,
          lineHeight: 1.32,
          color: COLORS.text,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    </div>
  );
};
