import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { GameBand } from "@/components/GameBand";
import { AppNav } from "@/components/AppNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { NativeFeelGuard } from "@/components/NativeFeelGuard";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { getCurrentProfile } from "@/features/auth/session";
import { navRoles } from "@/features/auth/roles";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "TAMBAYAN",
  title: {
    default: "TAMBAYAN — Scrim Finder",
    template: "%s — TAMBAYAN",
  },
  description:
    "The scrim network for Philippine collegiate esports. Find opponents at your level across MLBB, Valorant, Dota 2, and CoDM.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
  ],
  colorScheme: "light dark",
  // Native-app feel: lock the viewport so the shell can't be pinch-zoomed or
  // double-tap-zoomed. `touch-action` in globals.css does the real work on iOS
  // (which ignores user-scalable); this covers Android + desktop.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const profile = await getCurrentProfile();
  const roles = navRoles(profile);

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs once before first paint: applies a stored theme choice so a
            saved dark pref doesn't flash the light default. No stored choice →
            attribute stays unset and tokens.css follows the OS media query.
            (React dev-only warns "script tag while rendering" — harmless, gone
            in the production build; the tag is server-emitted and never needs
            to re-run on client navigation.) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('tambayan-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}",
          }}
        />
      </head>
      <body>
        <AuthProvider profile={profile}>
          <AppHeader />
          <Suspense fallback={<div className="game-band" aria-hidden />}>
            <GameBand />
          </Suspense>
          <main>{children}</main>
          <Suspense fallback={<nav className="app-tabbar" aria-hidden />}>
            <AppNav roles={roles} />
          </Suspense>
        </AuthProvider>
        <ServiceWorkerRegister />
        <NativeFeelGuard />
      </body>
    </html>
  );
}
