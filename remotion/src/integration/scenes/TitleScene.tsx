import React from "react";
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";
import { EntityCard } from "../components/EntityCard";
import { SceneShell } from "../components/SceneShell";
import { SceneProps } from "./types";

export const TitleScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rise = interpolate(frame, [0, 0.8 * fps], [40, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const titleOpacity = interpolate(frame, [0, 0.6 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const cards = [
    { icon: "keycloak" as const, name: "Keycloak", accent: COLORS.keycloak },
    { icon: "google" as const, name: "Google SSO", accent: COLORS.google },
    { icon: "freeipa" as const, name: "FreeIPA", accent: COLORS.freeipa },
  ];

  return (
    <SceneShell durationInFrames={durationInFrames} caption={caption}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 56,
          transform: `translateY(${rise}px)`,
        }}
      >
        <div style={{ textAlign: "center", opacity: titleOpacity }}>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 30,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: COLORS.textMuted,
              marginBottom: 18,
            }}
          >
            Unified Identity
          </div>
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 100,
              fontWeight: 900,
              color: COLORS.text,
              lineHeight: 1.03,
            }}
          >
            Keycloak · Google SSO
            <br />
            <span style={{ color: COLORS.keycloak }}>+ FreeIPA</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {cards.map((c, i) => {
            const delay = 0.5 * fps + i * 0.18 * fps;
            const p = interpolate(frame, [delay, delay + 0.5 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            return (
              <div
                key={c.name}
                style={{
                  opacity: p,
                  transform: `translateY(${(1 - p) * 30}px) scale(${0.9 + p * 0.1})`,
                }}
              >
                <EntityCard
                  icon={c.icon}
                  name={c.name}
                  accent={c.accent}
                  width={280}
                  iconSize={66}
                />
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
};
