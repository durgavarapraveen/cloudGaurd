"use client";

import { consumeSessionHandoff, hasSession } from "@/lib/session";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";

type AppShellProps = {
  children: React.ReactNode;
};

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

const adminSegments = new Set([
  "",
  "institution",
  "profile",
  "resources",
  "roles",
]);

const publicSegments = new Set(["login", "signup"]);

const adminNav = [
  {
    href: "/profile",
    label: "Users",
    icon: dashboardIcon,
  },
  {
    href: "/roles",
    label: "Roles & Permission",
    icon: dashboardIcon,
  },
  {
    href: "/institution",
    label: "Organization",
    icon: dashboardIcon,
  },
];

function accountNav(org: string) {
  return [
    {
      href: `/${org}`,
      label: "Dashboard",
      icon: dashboardIcon,
    },
    {
      href: `/${org}/findings`,
      label: "Findings",
      icon: findingsIcon,
    },
    {
      href: `/${org}/policies`,
      label: "Policies",
      icon: policiesIcon,
    },
    {
      href: `/${org}/resources`,
      label: "Resources",
      icon: resourcesIcon,
    },
  ];
}

import { useSyncExternalStore } from "react";

function useHasSession() {
  return useSyncExternalStore(
    () => () => {},
    () => hasSession(),
    () => false,
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const handoffConsumed = useRef(false);
  const [ready, setReady] = useState(false); // ✅ gate for redirect

  const isAuthenticated = useHasSession();
  const firstSegment = pathname.split("/").filter(Boolean)[0] ?? "";
  const isPublicRoute = publicSegments.has(firstSegment);
  const isAccountRoute = !adminSegments.has(firstSegment);
  const nav = isAccountRoute ? accountNav(firstSegment) : adminNav;

  useEffect(() => {
    if (!handoffConsumed.current) {
      consumeSessionHandoff();
      handoffConsumed.current = true;
    }
    setReady(true); // ✅ mark as ready after client hydration
  }, []);

  // useEffect(() => {
  //   if (!ready) return;
  //   if (!isPublicRoute && !isAuthenticated) {
  // router.replace("/login");
  // }
  // }, [ready, isPublicRoute, isAuthenticated, router]);

  // ✅ Show nothing until client is ready (prevents flash)
  // if (!ready) {
  //   return <main className="flex-1 min-h-screen">{children}</main>;
  // }

  // if (isPublicRoute) {
  //   return <main className="flex-1 min-h-screen">{children}</main>;
  // }

  // if (!isAuthenticated) {
  //   return null;
  // }

  return (
    <>
      <Sidebar nav={nav} />
      <main className="flex-1 ml-56 min-h-screen">{children}</main>
    </>
  );
}
