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
import { Icon } from "../components/Icon";
import { SceneShell } from "../components/SceneShell";
import { SceneProps } from "./types";

const APPS = ["Web app", "Dashboard", "Mobile API"];

export const KeycloakScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const connProgress = interpolate(frame, [0.5 * fps, 1.4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <SceneShell
      durationInFrames={durationInFrames}
      kicker="The broker"
      heading="Keycloak — the SSO hub"
      caption={caption}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <EntityCard
          icon="keycloak"
          name="Keycloak"
          role="identity broker"
          accent={COLORS.keycloak}
          width={380}
          glow
        />

        <Connector
          progress={connProgress}
          label="OpenID Connect"
          sublabel="/ SAML"
          color={COLORS.keycloak}
          width={300}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {APPS.map((name, i) => {
            const delay = 1.2 * fps + i * 0.18 * fps;
            const p = interpolate(frame, [delay, delay + 0.4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            return (
              <div
                key={name}
                style={{
                  width: 360,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  padding: "22px 28px",
                  borderRadius: 18,
                  background: COLORS.panel,
                  border: `1.5px solid ${COLORS.app}55`,
                  opacity: p,
                  transform: `translateX(${(1 - p) * 40}px)`,
                }}
              >
                <Icon name="app" size={44} color={COLORS.app} />
                <div
                  style={{
                    fontFamily: FONT.sans,
                    fontSize: 38,
                    fontWeight: 700,
                    color: COLORS.text,
                  }}
                >
                  {name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
};
