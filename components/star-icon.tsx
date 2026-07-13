import type { SVGProps } from "react";

type StarIconProps = SVGProps<SVGSVGElement> & {
  filled?: boolean;
};

export function StarIcon({ filled = false, ...props }: StarIconProps) {
  const color = filled ? "#F4B740" : "currentColor";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.19L12 17.18 6.44 20.1 7.5 13.91 3 9.53l6.22-.9L12 3Z" />
    </svg>
  );
}
