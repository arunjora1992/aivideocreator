import React from "react";
import { COLORS, FONT } from "../theme";

// A horizontal animated connector that "draws" from left to right as
// `progress` goes 0 -> 1, with an optional label chip and arrowheads.
export const Connector: React.FC<{
  progress: number;
  label?: string;
  sublabel?: string;
  color?: string;
  bidirectional?: boolean;
  width?: number;
  thickness?: number;
  // When true, the label floats above the line (absolutely positioned) so it
  // does not change the connector's box height — keeps the line on a shared
  // horizontal axis with neighbouring nodes.
  labelFloat?: boolean;
}> = ({
  progress,
  label,
  sublabel,
  color = COLORS.arrow,
  bidirectional = false,
  width = 260,
  thickness = 5,
  labelFloat = false,
}) => {
  const p = Math.max(0, Math.min(1, progress));
  const headOpacity = p > 0.85 ? (p - 0.85) / 0.15 : 0;

  return (
    <div
      style={{
        width,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        gap: 12,
      }}
    >
      {label ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            opacity: p,
            transform: `translateY(${(1 - p) * 8}px)`,
            ...(labelFloat
              ? {
                  position: "absolute",
                  bottom: "50%",
                  marginBottom: thickness,
                  left: 0,
                  right: 0,
                }
              : {}),
          }}
        >
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.text,
              background: `${color}22`,
              border: `1.5px solid ${color}`,
              padding: "6px 16px",
              borderRadius: 999,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </div>
          {sublabel ? (
            <div
              style={{
                fontFamily: FONT.mono,
                fontSize: 17,
                color: COLORS.textMuted,
                whiteSpace: "nowrap",
              }}
            >
              {sublabel}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          width: "100%",
          height: thickness,
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* track */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: thickness,
            borderRadius: thickness,
            background: `${color}33`,
          }}
        />
        {/* animated fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            height: thickness,
            width: `${p * 100}%`,
            borderRadius: thickness,
            background: color,
          }}
        />
        {/* right arrowhead */}
        <div
          style={{
            position: "absolute",
            right: -2,
            width: 0,
            height: 0,
            borderTop: "11px solid transparent",
            borderBottom: "11px solid transparent",
            borderLeft: `16px solid ${color}`,
            opacity: headOpacity,
          }}
        />
        {/* optional left arrowhead */}
        {bidirectional ? (
          <div
            style={{
              position: "absolute",
              left: -2,
              width: 0,
              height: 0,
              borderTop: "11px solid transparent",
              borderBottom: "11px solid transparent",
              borderRight: `16px solid ${color}`,
              opacity: headOpacity,
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
