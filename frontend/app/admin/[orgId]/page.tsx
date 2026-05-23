"use client";

import { rootUserAPI } from "@/lib/api";
import { getRootUserId } from "@/lib/session";
import { use, useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  email: string;
  organizationId: string;
};

type CreateUserPayload = {
  username: string;
  email: string;
  organizationId: string;
};

export default function UsersPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = use(params);
  const organizationId = orgId;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateUserPayload>({
    username: "",
    email: "",
    organizationId,
  });

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await rootUserAPI.allUsers(orgId);
      if (Array.isArray(res)) {
        setUsers(res);
      } else if (res?.data && Array.isArray(res.data)) {
        setUsers(res.data);
      } else if (res?.users && Array.isArray(res.users)) {
        setUsers(res.users);
      } else {
        setUsers([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) loadUsers();
  }, [orgId]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await rootUserAPI.create_user(form);
      setForm({ username: "", email: "", organizationId });
      setShowForm(false);
      await loadUsers();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create user",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Users
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage users for this organization.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
          }}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[13px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <line
              x1="6.5"
              y1="1"
              x2="6.5"
              y2="12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="1"
              y1="6.5"
              x2="12"
              y2="6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New User
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-[13px] font-medium text-white mb-4">
            Create User
          </h2>
          {formError && (
            <div className="mb-4 border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-[13px] text-red-400">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                  Username
                </span>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  maxLength={50}
                  placeholder="johndoe"
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="john@company.com"
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                Organization ID
              </span>
              <input
                name="organizationId"
                value={form.organizationId}
                // onChange={handleChange}
                required
                placeholder="UUID"
                className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50 font-mono"
              />
            </label>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[13px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && (
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                )}
                {submitting ? "Creating..." : "Create User"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-[13px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Username
              </th>
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Email
              </th>
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Organization ID
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                  </div>
                </td>
              </tr>
            ) : !users || users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-[13px] text-slate-600"
                >
                  No users yet. Create one to get started.
                </td>
              </tr>
            ) : (
              users.map((user, i) => (
                <tr
                  key={user.id ?? i}
                  className={`transition-colors hover:bg-white/[0.02] ${
                    i !== users.length - 1 ? "border-b border-white/[0.04]" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 text-[13px] text-slate-200 font-medium">
                    {user.username}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-400">
                    {user.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                      {user.organizationId ?? orgId}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setDeleteId(user.id)}
                      className="text-[12px] text-slate-600 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Count */}
      {!loading && users && users.length > 0 && (
        <p className="text-[12px] text-slate-600 mt-3 text-right">
          {users.length} user{users.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-[14px] font-medium text-white mb-2">
              Remove user?
            </h3>
            <p className="text-[13px] text-slate-500 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    await rootUserAPI.delete_user(deleteId);
                    setUsers((prev) => prev.filter((u) => u.id !== deleteId));
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setDeleteId(null);
                  }
                }}
                className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-[13px] font-medium text-red-400 hover:bg-red-500/20 transition-all"
              >
                Remove
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 text-[13px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
