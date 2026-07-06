import React from "react";
import { GOOGLE_COLORS } from "../theme";

// Simple, self-contained SVG glyphs (no external assets).

export type IconName =
  | "keycloak"
  | "freeipa"
  | "google"
  | "app"
  | "user"
  | "shield"
  | "lock"
  | "policy";

export const Icon: React.FC<{
  name: IconName;
  size?: number;
  color?: string;
}> = ({ name, size = 96, color = "#fff" }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "keycloak":
      // A key
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="4" />
          <path d="M11 11l8 8" />
          <path d="M16 16l2-2" />
          <path d="M19 19l2-2" />
        </svg>
      );
    case "freeipa":
      // Stacked directory / server
      return (
        <svg {...common}>
          <ellipse cx="12" cy="5" rx="7" ry="2.5" />
          <path d="M5 5v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5" />
          <path d="M5 11v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
        </svg>
      );
    case "google":
      // Multicolor "G" mark
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <path
            fill={GOOGLE_COLORS.blue}
            d="M47 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.9c-.6 3-2.3 5.5-4.8 7.2v6h7.8C44.5 37.5 47 31.6 47 24.5z"
          />
          <path
            fill={GOOGLE_COLORS.green}
            d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.8-6c-2.2 1.5-5 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.6v6.2C6.6 42.6 14.7 48 24 48z"
          />
          <path
            fill={GOOGLE_COLORS.yellow}
            d="M10.6 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6v-6.2H2.6C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l8-6.2z"
          />
          <path
            fill={GOOGLE_COLORS.red}
            d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.5 0 24 0 14.7 0 6.6 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z"
          />
        </svg>
      );
    case "app":
      // Browser window
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
          <circle cx="6" cy="6.5" r="0.6" fill={color} stroke="none" />
          <circle cx="8.2" cy="6.5" r="0.6" fill={color} stroke="none" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 5-3.4 8.2-7 10-3.6-1.8-7-5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "policy":
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6" />
        </svg>
      );
    default:
      return null;
  }
};
