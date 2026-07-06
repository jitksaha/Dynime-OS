import { useRef, useEffect, useState } from "react";
import { useLocation, useOutlet } from "react-router-dom";

/**
 * Keeps the previous page visible while the next lazy route loads.
 * Once the new outlet is ready it fades in; no blank flash.
 */
export function KeepAliveOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const prevOutlet = useRef(outlet);
  const [displayedPath, setDisplayedPath] = useState(location.pathname);

  useEffect(() => {
    // When location changes and the outlet is ready, update
    if (outlet) {
      prevOutlet.current = outlet;
      setDisplayedPath(location.pathname);
    }
  }, [location.pathname, outlet]);

  const content = outlet || prevOutlet.current;

  return (
    <div
      key={displayedPath}
      className="animate-in fade-in duration-150"
    >
      {content}
    </div>
  );
}
