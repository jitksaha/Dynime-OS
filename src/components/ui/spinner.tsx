import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "primary" | "white" | "muted";
}

/**
 * Branded orbital spinner — three dots chasing around a ring.
 * Used inline on buttons, links, popups, dialogs, etc.
 */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner({ size = "sm", className, variant = "primary" }, ref) {
  const sizes: Record<string, { container: string; dot: string; ring: string }> = {
    xs: { container: "h-3.5 w-3.5", dot: "h-[3px] w-[3px]", ring: "h-3.5 w-3.5" },
    sm: { container: "h-4 w-4", dot: "h-1 w-1", ring: "h-4 w-4" },
    md: { container: "h-5 w-5", dot: "h-1.5 w-1.5", ring: "h-5 w-5" },
    lg: { container: "h-8 w-8", dot: "h-2 w-2", ring: "h-8 w-8" },
    xl: { container: "h-10 w-10", dot: "h-2.5 w-2.5", ring: "h-10 w-10" },
  };

  const colors: Record<string, { dot: string; ring: string }> = {
    primary: { dot: "bg-primary", ring: "border-primary/20" },
    white: { dot: "bg-white", ring: "border-white/20" },
    muted: { dot: "bg-muted-foreground", ring: "border-muted-foreground/20" },
  };

  const s = sizes[size];
  const c = colors[variant];

  return (
    <span
      ref={ref}
      className={cn("inline-flex items-center justify-center relative", s.container, className)}
      role="status"
      aria-label="Loading"
    >
      {/* Faint track ring */}
      <span className={cn("absolute inset-0 rounded-full border", c.ring)} />
      {/* Orbiting dots */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn("absolute rounded-full orbital-dot", s.dot, c.dot)}
          style={{ animationDelay: `${i * -0.28}s` }}
        />
      ))}
    </span>
  );
});

/**
 * Ring spinner — a single spinning ring, good for larger loaders (dialogs, sections).
 */
export function RingSpinner({
  size = "md",
  className,
  variant = "primary",
}: SpinnerProps) {
  const sizes: Record<string, string> = {
    xs: "h-4 w-4",
    sm: "h-5 w-5",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  const colors: Record<string, string> = {
    primary: "border-primary/20 border-t-primary",
    white: "border-white/20 border-t-white",
    muted: "border-muted-foreground/20 border-t-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-full border-2 animate-spin",
        sizes[size],
        colors[variant],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

interface ButtonLoaderProps {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps button content to show spinner when loading.
 * Usage: <button><ButtonLoader loading={saving}>Save</ButtonLoader></button>
 */
export function ButtonLoader({ loading, children, className }: ButtonLoaderProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {loading && <Spinner size="xs" variant="white" />}
      {children}
    </span>
  );
}
