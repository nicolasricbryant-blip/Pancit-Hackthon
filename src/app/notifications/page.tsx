import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/session";

export const metadata: Metadata = { title: "Notifications" };

/**
 * Placeholder notifications inbox. There's no notifications table/pipeline
 * yet (scrim requests, ready-checks, and RSVPs all surface in their own
 * feeds today) — this is an honest empty state, not a fake feed, so the
 * destination in the nav isn't a dead link.
 */
export default async function NotificationsPage() {
  await requireProfile("/notifications");

  return (
    <div className="page-wrap">
      <h1 className="page-title">Notifications</h1>
      <p className="page-sub">
        Scrim requests, ready-checks, and RSVPs still live in their own
        pages for now — a unified inbox is on the way.
      </p>
      <div className="empty-state">
        <p>You&apos;re all caught up.</p>
      </div>
    </div>
  );
}
