import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Olympiad Codex",
    template: "%s | Olympiad Codex"
  },
  description: "A private Olympiad mathematics knowledge system for notes, problems, diagrams, and reviewed contributions.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "Olympiad Codex",
    description: "A private Olympiad mathematics knowledge system for serious mathematical notes.",
    siteName: "Olympiad Codex",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Olympiad Codex",
    description: "A private Olympiad mathematics knowledge system for serious mathematical notes."
  },
  appleWebApp: {
    capable: true,
    title: "Olympiad Codex",
    statusBarStyle: "default"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
