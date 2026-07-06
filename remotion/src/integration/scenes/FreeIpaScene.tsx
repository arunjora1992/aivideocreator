import React from "react";
import {
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT } from "../theme";
import { EntityCard } from "../components/EntityCard";
import { Icon, IconName } from "../components/Icon";
import { SceneShell } from "../components/SceneShell";
import { SceneProps } from "./types";

const FEATURES: { icon: IconName; label: string; sub: string }[] = [
  { icon: "freeipa", label: "LDAP directory", sub: "users & groups" },
  { icon: "lock", label: "Kerberos", sub: "single-realm auth" },
  { icon: "shield", label: "Managed hosts", sub: "enrolled machines" },
  { icon: "policy", label: "Access policies", sub: "sudo, HBAC, roles" },
];

export const FreeIpaScene: React.FC<SceneProps> = ({
  durationInFrames,
  caption,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <SceneShell
      durationInFrames={durationInFrames}
      kicker="The source of truth"
      heading="FreeIPA — internal identity"
      caption={caption}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 90 }}>
        <EntityCard
          icon="freeipa"
          name="FreeIPA"
          role="LDAP + Kerberos"
          accent={COLORS.freeipa}
          width={380}
          glow
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {FEATURES.map((f, i) => {
            const delay = 0.4 * fps + i * 0.22 * fps;
            const p = interpolate(frame, [delay, delay + 0.4 * fps], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            });
            return (
              <div
                key={f.label}
                style={{
                  width: 520,
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  padding: "16px 26px",
                  borderRadius: 18,
                  background: COLORS.panel,
                  border: `1.5px solid ${COLORS.freeipa}44`,
                  opacity: p,
                  transform: `translateX(${(1 - p) * -40}px)`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: `${COLORS.freeipa}1F`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={f.icon} size={38} color={COLORS.freeipa} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: FONT.sans,
                      fontSize: 38,
                      fontWeight: 700,
                      color: COLORS.text,
                    }}
                  >
                    {f.label}
                  </div>
                  <div
                    style={{
                      fontFamily: FONT.mono,
                      fontSize: 24,
                      color: COLORS.textMuted,
                    }}
                  >
                    {f.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneShell>
  );
};
