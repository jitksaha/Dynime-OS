import { SVGProps } from "react";

/**
 * Custom Dynime Pay icon — a stylised payment card with a chip and a
 * subtle "D" mark, drawn in the lucide stroke language so it pairs
 * cleanly with the rest of the sidebar.
 */
export const DynimePayIcon = ({
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
    {/* Card body */}
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />

    {/* Magnetic stripe */}
    <path d="M2.5 9.5h19" />

    {/* Chip */}
    <rect x="5" y="12" width="3.5" height="2.5" rx="0.6" />

    {/* "D" monogram */}
    <path d="M12 12h2.2a1.8 1.8 0 0 1 0 3.6H12z" />

    {/* Contactless waves */}
    <path d="M18 12.4c.5.4.8 1 .8 1.7s-.3 1.3-.8 1.7" opacity={0.7} />
    <path d="M19.6 11.2c.9.7 1.4 1.7 1.4 2.9s-.5 2.2-1.4 2.9" opacity={0.4} />
  </svg>
);

export default DynimePayIcon;
