import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Drives a slim top progress bar on every route change.
 */
export function useRouteProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevPath = useRef(location.pathname);

  const start = useCallback(() => {
    setVisible(true);
    setProgress(0);

    let p = 0;
    const tick = () => {
      if (p < 25) p += 8;
      else if (p < 50) p += 3;
      else if (p < 75) p += 1.5;
      else if (p < 90) p += 0.5;
      else p = Math.min(p + 0.1, 95);

      setProgress(p);
      if (p < 95) {
        timerRef.current = setTimeout(tick, p < 25 ? 40 : p < 50 ? 120 : 250);
      }
    };
    timerRef.current = setTimeout(tick, 0);
  }, []);

  const finish = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setProgress(100);
    timerRef.current = setTimeout(() => {
      setVisible(false);
      timerRef.current = setTimeout(() => setProgress(0), 200);
    }, 350);
  }, []);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      start();
      // Finish quickly — the route renders immediately now
      const done = setTimeout(finish, 150);
      return () => clearTimeout(done);
    }
  }, [location.pathname, start, finish]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { progress, visible };
}
