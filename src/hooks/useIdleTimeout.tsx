import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

const IDLE_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE_MS = 60 * 1000; // Show warning 60s before logout

export function useIdleTimeout() {
  const { user, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    if (!user) return;
    clearAllTimers();
    setShowWarning(false);

    // Show warning before actual logout
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      setSecondsLeft(Math.ceil(WARNING_BEFORE_MS / 1000));
      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    // Actually sign out
    timeoutRef.current = setTimeout(() => {
      signOut();
      setShowWarning(false);
    }, IDLE_TIMEOUT_MS);
  }, [user, signOut, clearAllTimers]);

  const stayActive = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      if (!showWarning) resetTimer();
    };

    IDLE_EVENTS.forEach((event) => document.addEventListener(event, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      IDLE_EVENTS.forEach((event) => document.removeEventListener(event, handleActivity));
      clearAllTimers();
    };
  }, [user, resetTimer, clearAllTimers, showWarning]);

  return { showWarning, secondsLeft, stayActive };
}
