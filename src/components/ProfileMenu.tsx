"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./ProfileMenu.module.css";

export interface ProfileMenuUser {
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Header profile control. Authed → initials button that opens a dropdown
 * (My Profile, Sign out). Anon → a "Sign in" link.
 */
export function ProfileMenu({ user }: { user: ProfileMenuUser | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Link href="/sign-in" className={styles.signInLink}>
        Sign in
      </Link>
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Profile — ${user.displayName}`}
        onClick={() => setOpen((v) => !v)}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className={styles.avatarImg} />
        ) : (
          initials(user.displayName)
        )}
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.mineHead}>
            <span className={styles.mineName}>{user.displayName}</span>
            {user.handle && (
              <span className={styles.mineHandle}>@{user.handle}</span>
            )}
          </div>

          <Link
            href="/profile"
            role="menuitem"
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            My Profile
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>

          <form
            action="/auth/sign-out"
            method="post"
            className={styles.signOutForm}
          >
            <button type="submit" role="menuitem" className={styles.item}>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
