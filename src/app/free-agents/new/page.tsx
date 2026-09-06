import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { coerceGameId } from "@/features/games/config";
import { getUser } from "@/features/auth/session";
import { getNewPostContext } from "@/features/free-agents/queries";
import { NewFreeAgentForm } from "@/features/free-agents/NewFreeAgentForm";
import styles from "@/features/free-agents/free-agents.module.css";

export const metadata: Metadata = { title: "Post a listing" };

export default async function NewFreeAgentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/free-agents/new");

  const sp = await searchParams;
  const game = coerceGameId(sp.game);
  const ctx = await getNewPostContext(user.id);

  return (
    <div className="feed-scope" data-game={game}>
      <div className={styles.formWrap}>
        <div>
          <h1 className="page-title">Post a listing</h1>
          <p className="page-sub">
            Put yourself on the board as a free agent, or list an open slot on a
            team you handle.
          </p>
        </div>

        <NewFreeAgentForm defaultGame={game} teams={ctx.teams} />
      </div>
    </div>
  );
}
