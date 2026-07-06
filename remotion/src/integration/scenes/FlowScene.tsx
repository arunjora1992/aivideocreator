import React from "react";
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";
import { Connector } from "../components/Connector";
import { Icon, IconName } from "../components/Icon";
import { SceneShell } from "../components/SceneShell";
import { SceneProps } from "./types";

// Circle badge whose caption is absolutely positioned below, so the badge's
// layout box is just the circle — every node then shares one center axis.
const NodeBadge: React.FC<{
  icon: IconName;
  label: string;
  color: string;
  progress: number;
  emphasize?: boolean;
}> = ({ icon, label, color, progress, emphasize }) => {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div
      style={{
        position: "relative",
        width: 128,
        height: 128,
        flexShrink: 0,
        opacity: p,
        transform: `translateY(${(1 - p) * 20}px) scale(${0.85 + p * 0.15})`,
      }}
    >
      <div
        style={{
          width: 128,
          height: 128,
          borderRadius: "50%",
          background: COLORS.panel,
          border: `3px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: emphasize ? `0 0 45px ${color}88` : "none",
        }}
      >
        <Icon name={icon} size={64} color={color} />
      </div>
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: 12,
          width: 180,
          fontFamily: FONT.mono,
          fontSize: 22,
          color: COLORS.textMuted,
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const FlowScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const F = durationInFrames - 0.5 * fps;
  const at = (from: number, to: number) =>
    interpolate(frame, [from * F, to * F], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });

  const optP = at(0.36, 0.52);
  const chosen = frame > 0.52 * F;

  return (
    <SceneShell
      durationInFrames={durationInFrames}
      kicker="The login flow"
      heading="One login, any identity"
      caption={caption}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <NodeBadge
          icon="user"
          label="User"
          color={COLORS.user}
          progress={at(0.0, 0.12)}
        />
        <Connector
          progress={at(0.08, 0.22)}
          width={130}
          color={COLORS.arrow}
        />

        <NodeBadge
          icon="app"
          label="Opens app"
          color={COLORS.app}
          progress={at(0.12, 0.24)}
        />
        <Connector
          progress={at(0.2, 0.35)}
          label="redirect"
          labelFloat
          width={150}
          color={COLORS.arrow}
        />

        {/* Keycloak, with stacked identity options floating above the circle */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: `translateX(-50%) translateY(${(1 - optP) * 14}px)`,
              marginBottom: 22,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              opacity: optP,
            }}
          >
            <OptionChip
              label="FreeIPA account"
              color={COLORS.freeipa}
              active={chosen}
            />
            <OptionChip label="Google" color={COLORS.google} active={false} />
          </div>
          <NodeBadge
            icon="keycloak"
            label="Keycloak verifies"
            color={COLORS.keycloak}
            progress={at(0.24, 0.36)}
            emphasize={chosen}
          />
        </div>

        <Connector
          progress={at(0.55, 0.72)}
          label="signed token · JWT"
          labelFloat
          width={200}
          color={COLORS.token}
        />
        <NodeBadge
          icon="shield"
          label="Access granted"
          color={COLORS.token}
          progress={at(0.72, 0.88)}
          emphasize={frame > 0.85 * F}
        />
      </div>
    </SceneShell>
  );
};

const OptionChip: React.FC<{
  label: string;
  color: string;
  active: boolean;
}> = ({ label, color, active }) => (
  <div
    style={{
      fontFamily: FONT.mono,
      fontSize: 20,
      fontWeight: 700,
      color: active ? "#FFFFFF" : COLORS.text,
      background: active ? color : `${color}22`,
      border: `1.5px solid ${color}`,
      padding: "8px 16px",
      borderRadius: 999,
      whiteSpace: "nowrap",
      textAlign: "center",
    }}
  >
    {label}
  </div>
);
