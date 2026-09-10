"use client";

import { useEffect } from "react";

const STORAGE_KEY = "tambayan-splash-shown";
const VISIBLE_MS = 1400;
const FADE_MS = 320;

/** Times out the server-rendered #app-splash node and records the session flag. */
export function SplashController() {
  useEffect(() => {
    const el = document.getElementById("app-splash");
    if (!el) return;

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // storage unavailable (private mode etc.) — still run the timers below
    }

    const leaveTimer = setTimeout(() => {
      el.classList.add("splash--leaving");
    }, VISIBLE_MS);

    const hideTimer = setTimeout(() => {
      el.style.display = "none";
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // best-effort only
      }
    }, VISIBLE_MS + FADE_MS);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return null;
}
