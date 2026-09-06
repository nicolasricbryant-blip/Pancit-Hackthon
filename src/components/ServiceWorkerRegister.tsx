"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (public/sw.js) after the app mounts.
 * Milestone 1 scope: installability + an offline app shell. No push, no sync.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // non-fatal: app works without the SW, just no offline shell.
      });
    };

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
