import React from "react";
import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";

export const Background: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* soft top glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(1300px 760px at 50% -10%, ${COLORS.bgGlow} 0%, rgba(245,247,251,0) 62%)`,
        }}
      />
      {/* faint grid */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${COLORS.grid} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.grid} 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(900px 600px at 50% 40%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(900px 600px at 50% 40%, black 30%, transparent 80%)",
        }}
      />
    </AbsoluteFill>
  );
};
