import styles from "./auth.module.css";

/** Centres the sign-in / sign-up card under the persistent app header. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.shell}>{children}</div>;
}
