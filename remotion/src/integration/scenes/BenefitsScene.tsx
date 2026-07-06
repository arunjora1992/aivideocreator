import React from "react";
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";
import { Icon, IconName } from "../components/Icon";
import { SceneShell } from "../components/SceneShell";
import { SceneProps } from "./types";

const BENEFITS: { icon: IconName; title: string; sub: string }[] = [
  {
    icon: "keycloak",
    title: "True single sign-on",
    sub: "one login for every app",
  },
  {
    icon: "shield",
    title: "MFA & policy",
    sub: "enforced in one place",
  },
  {
    icon: "lock",
    title: "No password sprawl",
    sub: "credentials stay in FreeIPA",
  },
];

export const BenefitsScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneShell
      durationInFrames={durationInFrames}
      kicker="The payoff"
      heading="What you get"
      caption={caption}
    >
      <div style={{ display: "flex", gap: 48 }}>
        {BENEFITS.map((b, i) => {
          const delay = 0.2 * fps + i * 0.28 * fps;
          const p = interpolate(frame, [delay, delay + 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div
              key={b.title}
              style={{
                width: 400,
                padding: "48px 36px",
                borderRadius: 24,
                background: COLORS.panel,
                border: `2px solid ${COLORS.token}44`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 22,
                textAlign: "center",
                opacity: p,
                transform: `translateY(${(1 - p) * 34}px) scale(${0.92 + p * 0.08})`,
              }}
            >
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: "50%",
                  background: `${COLORS.token}18`,
                  border: `1.5px solid ${COLORS.token}66`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={b.icon} size={58} color={COLORS.token} />
              </div>
              <div
                style={{
                  fontFamily: FONT.sans,
                  fontSize: 42,
                  fontWeight: 800,
                  color: COLORS.text,
                  lineHeight: 1.1,
                }}
              >
                {b.title}
              </div>
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 26,
                  color: COLORS.textMuted,
                }}
              >
                {b.sub}
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
