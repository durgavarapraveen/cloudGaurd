// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { SSEProvider } from "@/context/sseContext";
import { githubConnected, organizationConnected } from "@/lib/session";

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
    <html lang="en">
      <body
        className="bg-[#0a0a0f] text-slate-200 antialiased min-h-screen flex"
        suppressHydrationWarning
      >
        <SSEProvider>{children}</SSEProvider>
      </body>
    </html>
  );
}
