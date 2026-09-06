import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/features/auth/session";
import { SignUpForm } from "./SignUpForm";
import styles from "../auth.module.css";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignUpPage() {
  // Already signed in → no reason to be here.
  if (await getUser()) redirect("/");

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.sub}>
          Join the scrim network for Philippine collegiate esports.
        </p>
      </div>

      <SignUpForm />

      <p className={styles.altRow}>
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
