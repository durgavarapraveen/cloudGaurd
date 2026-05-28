// app/(org)/[accountId]/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { consumeSessionHandoff, hasSession } from "@/lib/session";
import Sidebar from "@/components/Sidebar";
import { use } from "react";

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

const findingsIcon = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2" />
    <line
      x1="7.5"
      y1="4.5"
      x2="7.5"
      y2="8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="7.5" cy="10.5" r="0.75" fill="currentColor" />
  </svg>
);

const policiesIcon = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect
      x="2"
      y="1"
      width="11"
      height="13"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <line
      x1="4.5"
      y1="5"
      x2="10.5"
      y2="5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <line
      x1="4.5"
      y1="7.5"
      x2="10.5"
      y2="7.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <line
      x1="4.5"
      y1="10"
      x2="8"
      y2="10"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const resourcesIcon = (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect
      x="1"
      y="4"
      width="13"
      height="3"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="1"
      y="9"
      width="13"
      height="3"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <circle cx="3.5" cy="5.5" r="0.75" fill="currentColor" />
    <circle cx="3.5" cy="10.5" r="0.75" fill="currentColor" />
  </svg>
);

const normalNav = () => [
  {
    href: "/organization/institution",
    label: "Organization",
    icon: dashboardIcon,
  },
  { href: "/organization/profile", label: "Users", icon: dashboardIcon },
  {
    href: "/organization/roles",
    label: "Roles & Permissions",
    icon: dashboardIcon,
  },
];

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    consumeSessionHandoff();
    // Auth is stored in localStorage, so this guard has to hydrate after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAuthenticated(hasSession());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) router.replace("/login");
  }, [ready, isAuthenticated, router]);

  if (!ready) {
    return (
      <main className="flex-1 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <Sidebar nav={normalNav()} />
      <main className="flex-1 ml-56 min-h-screen">{children}</main>
    </>
  );
}
