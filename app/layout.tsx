import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Olympiad Codex",
  description: "Your private Olympiad maths handbook.",
  manifest: "/manifest.webmanifest",
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
