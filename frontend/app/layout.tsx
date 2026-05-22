import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import SessionHandoff from "@/components/SessionHandoff";

export const metadata: Metadata = {
  title: "CloudGuard",
  description: "AWS Cloud Security Posture Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-[#0a0a0f] text-slate-200 antialiased min-h-screen flex"
        suppressHydrationWarning
      >
        <SessionHandoff />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
