import React from "react";
import { COLORS, FONT } from "../theme";
import { Icon, IconName } from "./Icon";

// A consistent "node" used across every diagram scene.
export const EntityCard: React.FC<{
  icon: IconName;
  name: string;
  role?: string;
  accent: string;
  width?: number;
  iconSize?: number;
  style?: React.CSSProperties;
  glow?: boolean;
}> = ({
  icon,
  name,
  role,
  accent,
  width = 340,
  iconSize = 84,
  style,
  glow = false,
}) => {
  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
        padding: "34px 28px 30px",
        borderRadius: 26,
        background: COLORS.panel,
        border: `2px solid ${accent}`,
        boxShadow: glow
          ? `0 0 55px ${accent}40, 0 18px 44px rgba(20,40,80,0.16)`
          : "0 18px 44px rgba(20,40,80,0.14)",
        ...style,
      }}
    >
      <div
        style={{
          width: iconSize + 44,
          height: iconSize + 44,
          borderRadius: 22,
          background: `${accent}1F`,
          border: `1.5px solid ${accent}55`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={iconSize} color={accent} />
      </div>
      <div
        style={{
          fontFamily: FONT.sans,
          fontWeight: 800,
          fontSize: 46,
          color: COLORS.text,
          textAlign: "center",
          lineHeight: 1.05,
        }}
      >
        {name}
      </div>
      {role ? (
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 24,
            color: COLORS.textMuted,
            textAlign: "center",
            letterSpacing: 0.5,
          }}
        >
          {role}
        </div>
      ) : null}
    </div>
  );
};
