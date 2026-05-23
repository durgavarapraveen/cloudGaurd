"use client";

import { rootUserAPI } from "@/lib/api";
import { getRootUserId } from "@/lib/session";
import Link from "next/link";
import { useEffect, useState } from "react";

type Organization = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

type CreateOrgPayload = {
  name: string;
  slug: string;
  description: string;
};

export default function OrganizationsPage() {
  const [userId, setUserId] = useState("");
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateOrgPayload>({
    name: "",
    slug: "",
    description: "",
  });

  useEffect(() => {
    const fetch = () => {
      const id = getRootUserId();
      console.log(id);
      if (id == null) return;
      loadOrgs(id);
      setUserId(id);
    };
    fetch();
  }, []);

  async function loadOrgs(userId: string) {
    setLoading(true);
    setError(null);
    if (userId == null) return;
    try {
      const res = await rootUserAPI.organization(userId);
      setOrgs(res.organization);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load organizations",
      );
    } finally {
      setLoading(false);
    }
  }

  // useEffect(() => {
  //   loadOrgs();
  // }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // auto-generate slug from name
      ...(name === "name"
        ? {
            slug: value
              .toLowerCase()
              .replace(/\s+/g, "-")
              .replace(/[^a-z0-9-]/g, ""),
          }
        : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    if (userId == null) return;
    try {
      await rootUserAPI.create_organization(form, userId);
      setForm({ name: "", slug: "", description: "" });
      setShowForm(false);
      await loadOrgs(userId);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create organization",
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
            Organizations
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage all tenant organizations on CloudGuard.
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
          New Organization
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="mb-6 bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-[13px] font-medium text-white mb-4">
            Create Organization
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
                  Name
                </span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Acme Corp"
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                  Slug
                </span>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  required
                  placeholder="acme-corp"
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                Description
              </span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="Brief description of this organization"
                className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50 resize-none"
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
                {submitting ? "Creating..." : "Create"}
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
                Name
              </th>
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Slug
              </th>
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                  </div>
                </td>
              </tr>
            ) : orgs.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-12 text-center text-[13px] text-slate-600"
                >
                  No organizations yet. Create one to get started.
                </td>
              </tr>
            ) : (
              orgs &&
              orgs.map((org, i) => (
                <tr
                  key={org.id}
                  className={`transition-colors hover:bg-white/[0.02] ${
                    i !== orgs.length - 1 ? "border-b border-white/[0.04]" : ""
                  }`}
                >
                  <Link href={`/admin/${org.id}`}>
                    <td className="px-5 py-3.5 text-[13px] text-slate-200 font-medium">
                      {org.name}
                    </td>
                  </Link>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                      {org.slug}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-500">
                    {org.description || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Count */}
      {!loading && orgs.length > 0 && (
        <p className="text-[12px] text-slate-600 mt-3 text-right">
          {orgs.length} organization{orgs.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
