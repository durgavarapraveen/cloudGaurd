"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { authApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { getCurrentUserId } from "@/lib/session";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      setError("Your session is missing. Please sign in again.");
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.changePassword({
        userId,
        oldPassword,
        newPassword,
      });
      setMessage(response.message || "Password updated successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(getErrorMessage(err, "Password change failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-8 relative z-10">
      <div className="max-w-xl fade-up">
        <div className="mb-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/15 text-emerald-300">
            <KeyRound size={20} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Change password
          </h1>
          <p className="mt-2 text-[13px] text-slate-500">
            Update the password used to access your CloudGuard account.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/[0.06] bg-[#0d0d14] p-6 space-y-4"
        >
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[13px] text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-[13px] text-emerald-300">
              {message}
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">
              Current password
            </span>
            <input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">
              New password
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-widest">
              Confirm new password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[13px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && (
              <span className="h-3 w-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
            )}
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
