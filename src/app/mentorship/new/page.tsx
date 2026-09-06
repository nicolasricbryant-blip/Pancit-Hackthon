import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/session";
import { NewMentorshipForm } from "@/features/mentorship/NewMentorshipForm";
import styles from "@/features/mentorship/mentorship.module.css";

export const metadata: Metadata = { title: "Request mentorship" };

export default async function NewMentorshipPage() {
  await requireProfile("/mentorship/new");

  return (
    <div className="feed-scope" data-game="mlbb">
      <div className={styles.formWrap}>
        <div>
          <h1 className="page-title">Request mentorship</h1>
          <p className="page-sub">
            Tell a mentor what you&apos;re working on. Your request stays open
            until a veteran or handler offers to take it.
          </p>
        </div>
        <NewMentorshipForm />
      </div>
    </div>
  );
}
