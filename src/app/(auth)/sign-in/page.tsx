import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/features/auth/session";
import { SignInForm } from "./SignInForm";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const nextRaw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  // Only allow same-origin relative paths as a redirect target.
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/";

  if (await getUser()) redirect(next);

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.sub}>Welcome back to TAMBAYAN.</p>
      </div>

      <SignInForm next={next} />

      <p className={styles.altRow}>
        New here? <Link href="/sign-up">Create an account</Link>
      </p>
    </div>
  );
}
