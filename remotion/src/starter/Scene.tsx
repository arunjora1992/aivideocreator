import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "./theme";
import type { Scene as SceneData } from "./scenes";

// A neutral, generic scene: title + body, with the narration shown as a caption
// band. Replace or extend this to build richer videos.
export const Scene: React.FC<{
  scene: SceneData;
  durationInFrames: number;
}> = ({ scene, durationInFrames }) => {
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
  const rise = interpolate(frame, [0, 0.6 * fps], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    // The background stays fully opaque so the very first frame (where Studio
    // parks the playhead) is never blank — only the content fades in/out.
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1300px 760px at 50% -10%, ${COLORS.bgGlow} 0%, rgba(245,247,251,0) 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 140px 260px",
          textAlign: "center",
          opacity,
        }}
      >
        <div style={{ transform: `translateY(${rise}px)` }}>
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 104,
              fontWeight: 900,
              color: COLORS.text,
              lineHeight: 1.04,
            }}
          >
            {scene.title}
          </div>
          {scene.body ? (
            <div
              style={{
                fontFamily: FONT.sans,
                fontSize: 48,
                fontWeight: 500,
                color: COLORS.muted,
                marginTop: 28,
                maxWidth: 1200,
              }}
            >
              {scene.body}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* Narration caption band */}
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
          background: "rgba(255,255,255,0.94)",
          border: `1px solid ${COLORS.border}`,
          boxShadow: "0 12px 34px rgba(20,40,80,0.14)",
          opacity,
        }}
      >
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 38,
            fontWeight: 500,
            lineHeight: 1.32,
            color: COLORS.text,
            textAlign: "center",
          }}
        >
          {scene.narration}
        </div>
      </div>
    </AbsoluteFill>
  );
};
