import React from "react";
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";
import { Icon } from "../components/Icon";
import { SceneShell } from "../components/SceneShell";
import { SceneProps } from "./types";

export const OutroScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p = interpolate(frame, [0, 0.7 * fps], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const marks = [
    { color: COLORS.keycloak, icon: "keycloak" as const },
    { color: COLORS.google, icon: "google" as const },
    { color: COLORS.freeipa, icon: "freeipa" as const },
  ];

  return (
    <SceneShell durationInFrames={durationInFrames} caption={caption}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 48,
          opacity: p,
          transform: `translateY(${(1 - p) * 30}px)`,
        }}
      >
        <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
          {marks.map((m, i) => (
            <div
              key={i}
              style={{
                width: 128,
                height: 128,
                borderRadius: 28,
                background: COLORS.panel,
                border: `2px solid ${m.color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={m.icon} size={72} color={m.color} />
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 96,
            fontWeight: 900,
            color: COLORS.text,
            textAlign: "center",
            lineHeight: 1.05,
          }}
        >
          One identity, <span style={{ color: COLORS.token }}>everywhere.</span>
        </div>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 30,
            letterSpacing: 2,
            color: COLORS.textMuted,
          }}
        >
          Keycloak + FreeIPA + Google SSO
        </div>
      </div>
    </SceneShell>
  );
};
