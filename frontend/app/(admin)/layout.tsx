// app/(admin)/admin/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { consumeSessionHandoff, hasSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";

const dashboardIcon = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect
      x="1"
      y="1"
      width="5.5"
      height="5.5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="8.5"
      y="1"
      width="5.5"
      height="5.5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="1"
      y="8.5"
      width="5.5"
      height="5.5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="8.5"
      y="8.5"
      width="5.5"
      height="5.5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const adminNav = [
  { href: "/admin/organization", label: "Organizations", icon: dashboardIcon },
  { href: "/profile", label: "Users", icon: dashboardIcon },
  { href: "/roles", label: "Roles & Permissions", icon: dashboardIcon },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  //   const router = useRouter();
  //   const [ready, setReady] = useState(false);
  //   const [isAuthenticated, setIsAuthenticated] = useState(false);

  //   useEffect(() => {
  //     consumeSessionHandoff();
  //     setIsAuthenticated(hasSession());
  //     setReady(true);
  //   }, []);

  //   useEffect(() => {
  //     if (!ready) return;
  //     if (!isAuthenticated) router.replace("/login");
  //   }, [ready, isAuthenticated, router]);

  //   if (!ready) {
  //     return (
  //       <main className="flex-1 min-h-screen flex items-center justify-center">
  //         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
  //       </main>
  //     );
  //   }

  //   if (!isAuthenticated) return null;

  return (
    <>
      {/* <Sidebar nav={adminNav} /> */}
      <main className="flex-1 min-h-screen">{children}</main>
    </>
  );
}
