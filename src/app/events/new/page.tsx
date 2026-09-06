import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/session";
import { getSchools } from "@/features/events/queries";
import { NewEventForm } from "@/features/events/NewEventForm";
import styles from "@/features/events/events.module.css";

export const metadata: Metadata = { title: "Host an event" };

export default async function NewEventPage() {
  const profile = await requireProfile("/events/new");
  const schools = await getSchools();

  return (
    <div className={styles.scope} data-game="mlbb">
      <div className={styles.formWrap}>
        <div>
          <h1 className={styles.pageTitle}>Host an event</h1>
          <p className={styles.pageSub}>
            Put a LAN, watch party, bootcamp, or tournament on the TAMBAYAN feed.
            You&apos;ll get a check-in QR once it&apos;s live.
          </p>
        </div>

        <NewEventForm
          schools={schools}
          defaultHostOrg={profile.display_name ?? ""}
        />
      </div>
    </div>
  );
}
