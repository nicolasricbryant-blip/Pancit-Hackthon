import Link from "next/link";
import { GAMES } from "@/features/games/config";
import styles from "./landing.module.css";

const FEATURES: Array<{ title: string; body: string; href: string }> = [
  {
    title: "Scrim Finder",
    body: "Browse open teams by rank band, format, and time window — request a scrim in one tap.",
    href: "/",
  },
  {
    title: "Lobbies & Auto-Join",
    body: "Drop into a pickup lobby or set your role and let auto-join slot you into a match that needs you.",
    href: "/lobbies",
  },
  {
    title: "Ladder & Leaderboards",
    body: "Team and player ratings, reliability scores, and standings — per game, always current.",
    href: "/leaderboards",
  },
  {
    title: "Brackets",
    body: "Run or join single/double-elim tournaments with live bracket trees and match reporting.",
    href: "/brackets",
  },
  {
    title: "Events",
    body: "LAN meetups, watch parties, and org announcements for your campus scene.",
    href: "/events",
  },
  {
    title: "Free Agents & Teams",
    body: "Recruit for an open roster slot or list yourself as looking for a squad.",
    href: "/free-agents",
  },
];

const STEPS: Array<{ n: string; title: string; body: string }> = [
  {
    n: "01",
    title: "Sign up",
    body: "Create an account and set up your player or team profile in a couple minutes.",
  },
  {
    n: "02",
    title: "Pick your game",
    body: "MLBB, Valorant, Dota 2, or CoDM — filter scrims, lobbies, and the ladder per title.",
  },
  {
    n: "03",
    title: "Play",
    body: "Request a scrim, join a lobby, or enter a bracket. Climb the ladder as you go.",
  },
];

/**
 * Public marketing landing page shown at `/` to signed-out visitors. Static —
 * no data fetching — so it renders instantly regardless of DB/auth latency.
 * Signed-in visitors see the live Scrim Finder feed instead (see app/page.tsx).
 */
export function LandingPage() {
  return (
    <div className={styles.scope}>
      <section className={styles.hero}>
        <p className={styles.kicker}>SCRIM NETWORK FOR PH COLLEGIATE ESPORTS</p>
        <h1 className={styles.headline}>
          Find your next scrim. Build your squad. Climb the ladder.
        </h1>
        <p className={styles.sub}>
          TAMBAYAN connects Philippine collegiate teams across MLBB, Valorant,
          Dota 2, and CoDM — scrims, pickup lobbies, brackets, and a live
          ladder in one place.
        </p>
        <div className={styles.ctaRow}>
          <Link href="/sign-up" className={styles.ctaPrimary}>
            Create free account
          </Link>
          <Link href="/sign-in" className={styles.ctaSecondary}>
            Sign in
          </Link>
        </div>
        <Link href="/?preview=1" className={styles.previewLink}>
          Peek at the live scrim board →
        </Link>
      </section>

      <section className={styles.gameStrip} aria-label="Supported games">
        {GAMES.map((g) => (
          <span key={g.id} className={styles.gameChip}>
            <span
              className={styles.gameDot}
              style={{ background: `var(${g.hueToken})` }}
              aria-hidden
            />
            {g.label}
          </span>
        ))}
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Everything for your squad</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureBody}>{f.body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.how}>
        <h2 className={styles.sectionTitle}>How it works</h2>
        <div className={styles.stepGrid}>
          {STEPS.map((s) => (
            <div key={s.n} className={styles.step}>
              <span className={styles.stepNum}>{s.n}</span>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepBody}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <h2 className={styles.finalCtaTitle}>Ready to play?</h2>
        <Link href="/sign-up" className={styles.ctaPrimary}>
          Create free account
        </Link>
      </section>
    </div>
  );
}
