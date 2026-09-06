"use client";

import { useEffect } from "react";

/**
 * Belt-and-suspenders for the "feels like a real app" viewport lock.
 *
 * `touch-action: pan-x pan-y` (globals.css) + the locked viewport handle the
 * common cases. Older iOS Safari still fires non-standard `gesturestart` /
 * `gesturechange` events for pinch, and a fast double-tap can still zoom on some
 * builds. This kills both without touching normal scroll or pan.
 */
export function NativeFeelGuard() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();

    // iOS pinch gesture events (non-standard, WebKit-only).
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("gestureend", stop, { passive: false });

    // Double-tap zoom: swallow the second tap inside 300ms.
    let lastTouch = 0;
    const onTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    };
    document.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return null;
}
