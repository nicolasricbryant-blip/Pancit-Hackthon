import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/features/auth/session";
import { SignInHero } from "./SignInHero";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const nextRaw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  // Only allow same-origin relative paths as a redirect target.
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : "/";

  if (await getUser()) redirect(next);

  return <SignInHero next={next} />;
}
