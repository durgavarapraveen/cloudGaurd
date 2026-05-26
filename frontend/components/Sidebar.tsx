"use client";

import { authApi, usersApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { clearSession, getCurrentUserId } from "@/lib/session";
import { ChevronUp, KeyRound, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type SidebarProps = {
  nav: {
    href: string;
    label: string;
    icon: React.ReactNode;
  }[];
};

export default function Sidebar({ nav }: SidebarProps) {
  const path = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [username, setUsername] = useState("User");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const currentUserId = getCurrentUserId();
      if (!cancelled) setUserId(currentUserId);
      if (!currentUserId) return;
      try {
        const profile = await usersApi.profile(currentUserId);
        if (cancelled) return;
        setUsername(profile.username || "User");
        setEmail(profile.email || "");
      } catch {
        if (!cancelled) setUsername("User");
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    try {
      if (userId) await authApi.logout(userId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Logout failed on server"));
    } finally {
      clearSession();
      router.replace("/login");
    }
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-[#0d0d14] border-r border-white/[0.06] flex flex-col z-40">
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1L12 4V10L7 13L2 10V4L7 1Z"
                stroke="#10b981"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
              <path
                d="M7 5L9 6.5V9.5L7 11L5 9.5V6.5L7 5Z"
                fill="#10b981"
                fillOpacity="0.4"
              />
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-white tracking-tight">
              CloudGuard
            </div>
            <div className="text-[10px] text-slate-500 tracking-wide uppercase">
              CSPM
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 px-1">
          Provider
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-orange-500/10 border border-orange-500/20">
          <div className="w-2 h-2 rounded-full bg-orange-400 pulse-dot" />
          <span className="text-[11px] text-orange-300 font-medium">AWS</span>
          <span className="ml-auto text-[10px] text-slate-500">ap-south-1</span>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-3 space-y-0.5">
        <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-2 px-2">
          Navigation
        </div>
        {nav.map((item) => {
          const active =
            path === item.href ||
            (item.href !== "/" && path.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] transition-all duration-150 group ${
                active
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={
                  active
                    ? "text-emerald-400"
                    : "text-slate-500 group-hover:text-slate-300"
                }
              >
                {item.icon}
              </span>
              {item.label}
              {active && (
                <span className="ml-auto w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative px-3 py-3 border-t border-white/[0.06]">
        <div
          className={`absolute left-3 right-3 bottom-[76px] rounded-lg border border-white/[0.08] bg-[#11121b] shadow-2xl shadow-black/40 transition-all duration-200 ${
            profileOpen
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-3 opacity-0 pointer-events-none"
          }`}
        >
          <div className="px-3 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                <UserRound size={17} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">
                  {username}
                </p>
                {email && (
                  <p className="truncate text-[11px] text-slate-500">
                    {email}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Link
            href="/organization/change-password"
            onClick={() => setProfileOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <KeyRound size={15} className="text-slate-500" />
            Change password
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200"
          >
            <LogOut size={15} className="text-red-400" />
            Logout
          </button>
        </div>

        <button
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          className="flex w-full items-center gap-2.5 rounded-md border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/10"
          aria-expanded={profileOpen}
          aria-label="Open profile menu"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-[12px] font-semibold text-emerald-300">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-slate-200">
              {username}
            </p>
            <p className="text-[10px] text-slate-600">CloudGuard v0.1</p>
          </div>
          <ChevronUp
            size={14}
            className={`text-slate-500 transition-transform ${
              profileOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
    </aside>
  );
}
