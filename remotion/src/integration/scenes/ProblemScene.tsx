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

const APPS = ["CRM", "Email", "Wiki", "VPN", "Git", "HR Portal"];

export const ProblemScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneShell
      durationInFrames={durationInFrames}
      kicker="The problem"
      heading="A password for every app"
      caption={caption}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 40,
        }}
      >
        {APPS.map((name, i) => {
          const delay = 0.2 * fps + i * 0.12 * fps;
          const p = interpolate(frame, [delay, delay + 0.4 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div
              key={name}
              style={{
                width: 320,
                padding: "26px 30px",
                borderRadius: 20,
                background: COLORS.panel,
                border: `2px solid ${COLORS.freeipa}55`,
                display: "flex",
                alignItems: "center",
                gap: 20,
                opacity: p,
                transform: `translateY(${(1 - p) * 24}px)`,
              }}
            >
              <Icon name="app" size={52} color={COLORS.textMuted} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: FONT.sans,
                    fontSize: 34,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: 30,
                    letterSpacing: 4,
                    color: COLORS.freeipa,
                  }}
                >
                  ••••••••
                </div>
              </div>
              <Icon name="lock" size={34} color={COLORS.freeipa} />
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
