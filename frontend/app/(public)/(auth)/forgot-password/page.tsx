"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { authApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await authApi.forgotPassword(email);
      setMessage(response.message || "Reset link sent if the email exists.");
    } catch (err) {
      setError(getErrorMessage(err, "Password reset request failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-screen p-8 flex items-center justify-center relative z-10">
      <div className="w-full max-w-md fade-up">
        <div className="mb-8">
          <div className="w-11 h-11 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-5 text-emerald-300">
            <Mail size={20} />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Forgot password
          </h1>
          <p className="text-[13px] text-slate-500 mt-2">
            Enter your account email and we will send a reset link.
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
          {message && (
            <div className="border border-emerald-500/30 bg-emerald-500/10 rounded-lg p-3 text-[13px] text-emerald-300">
              {message}
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
              placeholder="you@company.com"
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
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <div className="text-[12px] text-slate-500 text-center pt-2">
            Remembered it?{" "}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
