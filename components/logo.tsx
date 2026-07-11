import React from "react";

export function PupitarLogo({ size = 20, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, flexShrink: 0, ...style }}
    >
      <path d="M12 2C8 6 6 11 6 15c0 3.3 2.7 6 6 6s6-2.7 6-6c0-4-2-9-6-13z" />
      <path d="M9 12h6" />
      <path d="M8 15h8" />
      <path d="M9 18h6" />
    </svg>
  );
}
