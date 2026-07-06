import React from "react";
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../theme";
import { EntityCard } from "../components/EntityCard";
import { SceneShell } from "../components/SceneShell";
import { SceneProps } from "./types";

const PLAYERS = [
  {
    icon: "freeipa" as const,
    name: "FreeIPA",
    role: "internal identity store",
    accent: COLORS.freeipa,
  },
  {
    icon: "keycloak" as const,
    name: "Keycloak",
    role: "SSO broker",
    accent: COLORS.keycloak,
  },
  {
    icon: "google" as const,
    name: "Google",
    role: "external login",
    accent: COLORS.google,
  },
];

export const PlayersScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneShell
      durationInFrames={durationInFrames}
      kicker="The cast"
      heading="Three pieces, one system"
      caption={caption}
    >
      <div style={{ display: "flex", gap: 56 }}>
        {PLAYERS.map((p, i) => {
          const delay = 0.2 * fps + i * 0.3 * fps;
          const t = interpolate(frame, [delay, delay + 0.5 * fps], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });
          return (
            <div
              key={p.name}
              style={{
                opacity: t,
                transform: `translateY(${(1 - t) * 34}px) scale(${0.9 + t * 0.1})`,
              }}
            >
              <EntityCard
                icon={p.icon}
                name={p.name}
                role={p.role}
                accent={p.accent}
                width={360}
              />
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
