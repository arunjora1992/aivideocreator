import React from "react";
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";
import { EntityCard } from "../components/EntityCard";
import { Connector } from "../components/Connector";
import { SceneShell } from "../components/SceneShell";
import { SceneProps } from "./types";

export const GoogleScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const connProgress = interpolate(frame, [0.5 * fps, 1.5 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const noteP = interpolate(frame, [1.6 * fps, 2.1 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneShell
      durationInFrames={durationInFrames}
      kicker="Integration · 2 of 2"
      heading="Identity brokering to Google"
      caption={caption}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 44,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <EntityCard
            icon="keycloak"
            name="Keycloak"
            role="identity broker"
            accent={COLORS.keycloak}
            width={360}
          />
          <Connector
            progress={connProgress}
            label="OAuth 2.0 / OIDC"
            sublabel="identity provider"
            color={COLORS.google}
            bidirectional
            width={360}
          />
          <EntityCard
            icon="google"
            name="Google"
            role="external IdP"
            accent={COLORS.google}
            width={360}
          />
        </div>

        <div
          style={{
            opacity: noteP,
            transform: `translateY(${(1 - noteP) * 16}px)`,
            fontFamily: FONT.mono,
            fontSize: 28,
            color: COLORS.token,
            background: `${COLORS.token}14`,
            border: `1.5px solid ${COLORS.token}55`,
            padding: "12px 26px",
            borderRadius: 999,
          }}
        >
          ✓ Sign in with a Google account
        </div>
      </div>
    </SceneShell>
  );
};
