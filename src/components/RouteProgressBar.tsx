import { useRouteProgress } from "@/hooks/useRouteProgress";

/**
 * Slim 3px progress bar at the very top of the viewport.
 */
export function RouteProgressBar() {
  const { progress, visible } = useRouteProgress();

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease-out",
      }}
    >
      <div
        className="h-full route-progress-bar"
        style={{
          width: `${progress}%`,
          transition:
            progress === 100
              ? "width 200ms ease-out"
              : progress < 30
                ? "width 60ms linear"
                : "width 500ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {visible && progress < 100 && (
        <div
          className="absolute top-0 right-0 h-[3px] w-[80px]"
          style={{
            background: "linear-gradient(to right, transparent, hsl(var(--primary) / 0.6))",
            boxShadow: "0 0 10px 3px hsl(var(--primary) / 0.3)",
          }}
        />
      )}
    </div>
  );
}
