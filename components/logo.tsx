import React from "react";

export function PupitarLogo({ size = 20, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <img
      src="/logo.svg"
      alt="Pupitar Logo"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        ...style
      }}
    />
  );
}
