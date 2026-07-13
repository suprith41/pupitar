import type { SVGProps } from "react";
import { useId } from "react";

type StarIconProps = SVGProps<SVGSVGElement> & {
  filled?: boolean;
};

export function StarIcon({ filled = false, ...props }: StarIconProps) {
  const gradientId = `pupitar-star-${useId().replace(/:/g, "")}`;
  const color = filled ? `url(#${gradientId})` : "currentColor";

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
      {filled ? (
        <defs>
          <linearGradient id={gradientId} x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF3A3" />
            <stop offset="0.42" stopColor="#F8C84E" />
            <stop offset="1" stopColor="#C98512" />
          </linearGradient>
        </defs>
      ) : null}
      <path d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.19L12 17.18 6.44 20.1 7.5 13.91 3 9.53l6.22-.9L12 3Z" />
    </svg>
  );
}
