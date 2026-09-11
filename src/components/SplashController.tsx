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
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        // Keep the declarative hide (`:root[data-splash="skip"] .splash`)
        // consistent with the flag even on this early-return path — the
        // <head> script only reads the flag on the *next* full page load, so
        // without this the attribute could be missing on the current one.
        document.documentElement.dataset.splash = "skip";
        return;
      }
    } catch {
      // storage unavailable (private mode etc.) — still run the timers below
    }

    const leaveTimer = setTimeout(() => {
      el.classList.add("splash--leaving");
    }, VISIBLE_MS);

    const hideTimer = setTimeout(() => {
      el.style.display = "none";
      // Belt-and-suspenders over the inline style above: `el.style.display`
      // is an untracked DOM mutation, so if this node is ever re-created by a
      // re-render within the current page's lifetime, the full-screen splash
      // would come back and swallow every click. The declarative CSS rule
      // hides it regardless of what triggered the re-render.
      document.documentElement.dataset.splash = "skip";
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
