import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { NativeFeelGuard } from "@/components/NativeFeelGuard";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { getCurrentProfile } from "@/features/auth/session";

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
  themeColor: "#0b0d10",
  colorScheme: "dark",
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

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <AuthProvider profile={profile}>
          <AppHeader />
          <main>{children}</main>
        </AuthProvider>
        <ServiceWorkerRegister />
        <NativeFeelGuard />
      </body>
    </html>
  );
}
