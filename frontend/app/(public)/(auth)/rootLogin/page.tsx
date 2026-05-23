"use client";

import { FormEvent, useState } from "react";
import { rootUserAuthApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { saveSession } from "@/lib/session";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = {
        username: email,
        password: password,
      };
      const session = await rootUserAuthApi.login(data);
      saveSession(session);
      window.location.href = `/admin/organization`;
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-screen p-8 flex items-center justify-center relative z-10">
      <div className="w-full max-w-md fade-up">
        <div className="mb-8">
          <div className="w-11 h-11 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-5">
            <svg width="21" height="21" viewBox="0 0 21 21" fill="none">
              <path
                d="M10.5 2L17 5.75V10.5C17 14.35 14.35 17.95 10.5 19C6.65 17.95 4 14.35 4 10.5V5.75L10.5 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-emerald-400"
              />
              <path
                d="M8 10.5L9.8 12.3L13.5 8.6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-300"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Sign in to CloudGuard (Root Sign-in)
          </h1>
          <p className="text-[13px] text-slate-500 mt-2">
            Access scans, policies, resources, and account controls.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-[13px] text-red-400">
              {error}
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">
              Username
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
              placeholder="Enter your Username"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
              placeholder="Minimum 8 characters"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[13px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <span className="w-3 h-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
            )}
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {/* <div className="text-[12px] text-slate-500 text-center pt-2">
            New to CloudGuard?{" "}
            <Link
              href="/signup"
              className="text-emerald-400 hover:text-emerald-300"
            >
              Create an account
            </Link>
          </div> */}
        </form>
      </div>
    </div>
  );
}
