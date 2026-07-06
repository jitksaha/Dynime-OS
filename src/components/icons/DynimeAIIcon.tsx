import { SVGProps } from "react";

/**
 * Custom Dynime AI icon — a softly rounded square holding the "AI" mark
 * accompanied by an orbiting four-point sparkle. Inspired by the user's
 * reference but redrawn in the lucide stroke style so it sits naturally
 * alongside the rest of the sidebar icons.
 */
export const DynimeAIIcon = ({
  size = 24,
  strokeWidth = 1.75,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Rounded card / chip */}
    <path d="M4 8.5A4.5 4.5 0 0 1 8.5 4h5" />
    <path d="M15.5 20H8.5A4.5 4.5 0 0 1 4 15.5v-3" />
    <path d="M20 11.5v4A4.5 4.5 0 0 1 15.5 20" />

    {/* "AI" letterforms */}
    <path d="M7.5 14.5 9 10l1.5 4.5" />
    <path d="M7.9 13h2.2" />
    <path d="M12.5 10v4.5" />

    {/* Primary sparkle */}
    <path
      d="M17 3.2 17.9 5.6 20.3 6.5 17.9 7.4 17 9.8 16.1 7.4 13.7 6.5 16.1 5.6Z"
      fill="currentColor"
      stroke="none"
    />

    {/* Secondary mini sparkle */}
    <path
      d="M21 10.2 21.4 11.2 22.4 11.6 21.4 12 21 13 20.6 12 19.6 11.6 20.6 11.2Z"
      fill="currentColor"
      stroke="none"
      opacity={0.55}
    />
  </svg>
);

export default DynimeAIIcon;
