"use client";

import { logoutDueToIdle } from "@/app/actions/auth";
import { useCallback, useEffect, useRef } from "react";

/** 15 menit */
const IDLE_MS = 900_000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "wheel",
] as const;

/**
 * Mendeteksi ketidakaktifan (mouse, scroll, keyboard, dll.) dan memanggil logout
 * setelah batas waktu tanpa aktivitas.
 */
export function useIdleTimeout(enabled: boolean = true): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loggingOutRef = useRef(false);

  const scheduleLogout = useCallback(() => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    void logoutDueToIdle();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const resetTimer = () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(scheduleLogout, IDLE_MS);
    };

    resetTimer();

    const onActivity = () => {
      resetTimer();
    };

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true, capture: true });
    }

    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity, true);
      }
    };
  }, [enabled, scheduleLogout]);
}
