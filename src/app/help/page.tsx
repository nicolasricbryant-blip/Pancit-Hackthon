import type { Metadata } from "next";
import styles from "./help.module.css";

export const metadata: Metadata = { title: "Help & Support" };

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I get a Verified rank badge?",
    a: "Go to Profile → Add / Verify Another Game, fill in your rank for that title, and attach a screenshot. An admin or verified org handler reviews it — approved submissions flip your badge to Verified.",
  },
  {
    q: "How does Find Match work?",
    a: "Match picks a mode, rank band, and mic preference for you, then either drops you into a compatible open lobby or hosts a new one and waits for other players to be auto-matched in. Once your squad fills, you land on the lobby's ready-check.",
  },
  {
    q: "What's the difference between Scrims and Lobbies?",
    a: "Scrims are team-vs-team matches with an agreed ruleset and a reported result that feeds your rating. Lobbies are pickup parties for filling out a squad — casual, ranked grind, or warm-up before a scrim.",
  },
  {
    q: "Why does my leaderboard rating say \"—\"?",
    a: "Ratings populate once your team has a confirmed scrim or bracket match for that game. New teams show blank until their first result is confirmed by both sides.",
  },
  {
    q: "What happens if I have exams?",
    a: "Turn on exam mode in Settings — your listings pause without hurting your reliability score, and your profile shows you're studying instead of ghosting.",
  },
];

export default function HelpPage() {
  return (
    <div className={styles.wrap}>
      <h1 className="page-title">Help &amp; Support</h1>
      <p className="page-sub">
        Answers to the most common questions. Can&apos;t find yours — ask
        your school&apos;s org handler or team captain.
      </p>

      <div className={styles.list}>
        {FAQS.map((f) => (
          <div key={f.q} className={styles.item}>
            <p className={styles.q}>{f.q}</p>
            <p className={styles.a}>{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
