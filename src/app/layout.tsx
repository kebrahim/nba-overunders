import type { Metadata } from "next";
import { Geist, Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";
import { Nav } from "./nav";
import { APP_NAME, APP_TAGLINE } from "@/lib/config/app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: "A season-long NBA win-total draft contest for 5 friends.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">
        <Nav />
        {children}
        <footer className="flex justify-center gap-4 border-t border-border bg-surface/80 px-6 py-4 text-center text-xs text-ink-muted">
          <a href="/privacy" className="hover:text-ink">
            Privacy Policy
          </a>
          <a href="/terms" className="hover:text-ink">
            Terms &amp; Conditions
          </a>
        </footer>
      </body>
    </html>
  );
}
