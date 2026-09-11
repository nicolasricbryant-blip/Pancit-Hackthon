import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { GameBand } from "@/components/GameBand";
import { AppNav } from "@/components/AppNav";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { NativeFeelGuard } from "@/components/NativeFeelGuard";
import { SplashScreen } from "@/components/SplashScreen";
import { SplashController } from "@/components/SplashController";
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
  // First-run onboarding trap (proxy.ts) sends any authed, un-onboarded user
  // back to /onboarding no matter what they tap — so the tab bar / rail and
  // game switcher would be dead controls if shown here. Suppress them (and
  // reduce the header to a non-navigating form) while the gate is active;
  // `onboarding-gate` on <body> lets globals.css collapse the layout gutters
  // that assume the tab bar / rail is actually on screen.
  const onboardingGate = profile != null && !profile.onboarded;

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
            Also skips the splash screen if this tab already showed it this
            session (data-splash="skip", read by .splash in globals.css) — same
            reasoning as the theme flag: a synchronous pre-paint check, not a
            client-mounted one, so there's no flash of the thing being hidden.
            (React dev-only warns "script tag while rendering" — harmless, gone
            in the production build; the tag is server-emitted and never needs
            to re-run on client navigation.) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('tambayan-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}" +
              "try{if(sessionStorage.getItem('tambayan-splash-shown')==='1')document.documentElement.dataset.splash='skip';}catch(e){}",
          }}
        />
      </head>
      <body className={onboardingGate ? "onboarding-gate" : undefined}>
        <AuthProvider profile={profile}>
          <AppHeader restricted={onboardingGate} />
          {!onboardingGate && (
            <Suspense fallback={<div className="game-band" aria-hidden />}>
              <GameBand />
            </Suspense>
          )}
          <main>{children}</main>
          {!onboardingGate && (
            <Suspense fallback={<nav className="app-tabbar" aria-hidden />}>
              <AppNav roles={roles} />
            </Suspense>
          )}
        </AuthProvider>
        <ServiceWorkerRegister />
        <NativeFeelGuard />
        <SplashScreen />
        <SplashController />
      </body>
    </html>
  );
}
