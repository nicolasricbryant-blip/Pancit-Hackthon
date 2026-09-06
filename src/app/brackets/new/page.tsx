import type { Metadata } from "next";
import { coerceGameId } from "@/features/games/config";
import { requireProfile } from "@/features/auth/session";
import { NewBracketForm } from "@/features/brackets/NewBracketForm";
import styles from "@/features/brackets/brackets.module.css";

export const metadata: Metadata = { title: "Host a tournament" };

export default async function NewBracketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireProfile("/brackets/new");

  const sp = await searchParams;
  const defaultGame = coerceGameId(sp.game);

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Host a tournament</h1>
      <p className={styles.sub}>
        Single-elimination. You seed the bracket and confirm every result.
      </p>
      <NewBracketForm defaultGame={defaultGame} />
    </div>
  );
}
