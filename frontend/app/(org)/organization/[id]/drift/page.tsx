"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ALL_STATUSES,
  Comment,
  DriftResource,
  DriftStatus,
  Group,
  PaginatedDrifts,
} from "@/lib/props";
import { drifts } from "@/lib/api";
import PathName from "@/components/PathName";
import { GroupsAPI } from "@/lib/api";

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_META: Record<
  DriftStatus,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  new: {
    label: "New",
    color: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    dot: "bg-sky-400",
  },
  assigned: {
    label: "Assigned",
    color: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/25",
    dot: "bg-violet-400",
  },
  "in-progress": {
    label: "In Progress",
    color: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    dot: "bg-amber-400 animate-pulse",
  },
  resolved: {
    label: "Resolved",
    color: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    dot: "bg-emerald-400",
  },
  ignored: {
    label: "Ignored",
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/25",
    dot: "bg-slate-500",
  },
};

function getUserRole(): "admin" | "user" {
  return "admin";
  if (typeof window === "undefined") return "user";
  //   try {
  //     const raw = localStorage.getItem("user");
  //     if (!raw) return "user";
  //     const user = JSON.parse(raw);
  // return user?.role === "admin" ? "admin" : "user";
  // return "admin";
  //   } catch {
  //     return "user";
  //   }
}

function formatDate(dt: string) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function fetchDrifts(
  accountIdentifier: string,
  page: number,
  pageSize: number,
  role: string,
  status?: string,
): Promise<PaginatedDrifts> {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (status) params.set("status", status);
  let res;
  if (role == "admin") {
    res = await drifts.fetchDrifts(accountIdentifier, page, pageSize, status);
  } else {
    res = await drifts.fetchDriftsforUser(
      accountIdentifier,
      page,
      pageSize,
      status,
    );
  }

  return res;
}

async function updateAdmin(
  driftId: string,
  assigned_grp: string,
): Promise<void> {
  const res = await drifts.updateAdmin(driftId, assigned_grp);
}

async function updateUser(
  driftId: string,
  status: DriftStatus,
  comment: string,
): Promise<void> {
  const res = await drifts.updateAssigne(driftId, status, comment);
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DriftStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${m.color} ${m.bg} ${m.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function DriftDrawer({
  drift,
  role,
  onClose,
  onSaved,
}: {
  drift: DriftResource;
  role: "admin" | "user";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<DriftStatus>(drift.status);
  const [comment, setComment] = useState("");
  const [assignedGrp, setAssignedGrp] = useState<string>(
    drift.assigned_to_id ?? "",
  );

  const [groupSearch, setGroupSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const comments: Comment[] = drift.comments ?? [];

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (role === "admin") {
        if (assignedGrp === "") {
          setError("You need to select Group ID");
          return;
        }
        await updateAdmin(drift.id, assignedGrp);
      } else {
        await updateUser(drift.id, status, comment);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const fetch = async () => {
      const res = await GroupsAPI.allGroups();
      setAllGroups(res);
    };

    fetch();
  }, []);

  const filteredGroups = allGroups
    .filter((g) => {
      if (!groupSearch.trim()) return true;
      return g.name.toLowerCase().includes(groupSearch.toLowerCase());
    })
    .slice(0, 4);

  const selectedGroup = allGroups.find((g) => g.id === assignedGrp);

  useEffect(() => {
    if (selectedGroup) {
      setGroupSearch(selectedGroup.name);
    }
  }, [selectedGroup]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-lg h-full bg-[#0a0a10] border-l border-white/[0.06] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-start justify-between">
          <div>
            <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">
              Drift Detail
            </div>
            <h2 className="text-[15px] font-semibold text-white leading-tight">
              {drift.resource_name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={drift.status} />
              <span className="text-[11px] font-mono text-slate-600">
                {drift.resource_type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition-colors p-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Resource ID", value: drift.resource_name },
              { label: "Issue", value: drift.issue_with_resource },
              { label: "Detected", value: formatDate(drift.first_seen) },
              { label: "Assigned Group", value: selectedGroup?.name || "—" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2.5"
              >
                <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">
                  {item.label}
                </div>
                <div className="text-[12px] text-slate-300 font-mono truncate">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {/* Admin: assign group */}
          {role === "admin" && (
            <div className="space-y-2">
              <label className="text-[11px] text-slate-500 uppercase tracking-widest">
                Assign to Group
              </label>

              <div className="relative">
                <input
                  value={groupSearch}
                  onChange={(e) => {
                    setGroupSearch(e.target.value);
                    setAssignedGrp("");
                  }}
                  placeholder="Search groups..."
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50 transition-colors"
                />

                {groupSearch && filteredGroups.length > 0 && (
                  <div className="absolute mt-2 w-full rounded-xl border border-white/[0.08] bg-[#11131a] shadow-2xl overflow-hidden z-20 max-h-60 overflow-y-auto">
                    {filteredGroups.map((group) => {
                      const selected = assignedGrp === group.id;

                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setAssignedGrp(group.id);
                            setGroupSearch(group.name);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-[13px] transition-all border-b border-white/[0.04] last:border-b-0 ${
                            selected
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "text-slate-300 hover:bg-white/[0.03]"
                          }`}
                        >
                          <span>{group.name}</span>

                          {selected && (
                            <span className="text-[11px] text-emerald-500">
                              Selected
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedGroup && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-emerald-500">
                      Assigned Group
                    </div>

                    <div className="text-[13px] text-emerald-300">
                      {selectedGroup.name}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignedGrp("");
                      setGroupSearch("");
                    }}
                    className="text-[11px] text-slate-500 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
          {/* User: status + comment */}
          {/* {role === "user" &&  */}(
          <>
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 uppercase tracking-widest">
                Update Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_STATUSES.map((s) => {
                  const m = STATUS_META[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-all ${
                        status === s
                          ? `${m.color} ${m.bg} ${m.border}`
                          : "text-slate-500 border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${status === s ? m.dot : "bg-slate-700"}`}
                      />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-500 uppercase tracking-widest">
                Comment
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Add a comment about this drift..."
                className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50 transition-colors resize-none"
              />
            </div>

            {comments.length > 0 &&
              comments.map((m, i) => (
                <div
                  key={i}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-[12px] font-semibold text-emerald-400 uppercase">
                        {m.user.username?.charAt(0)}
                      </div>

                      <div className="flex flex-col">
                        <p className="text-[13px] font-medium text-slate-200">
                          {m.user.username}
                        </p>

                        <p className="text-[11px] text-slate-500">
                          Updated Drift
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 whitespace-nowrap">
                      {formatDate(m.created_at)}
                    </p>
                  </div>

                  {/* Comment */}
                  <div className="rounded-xl border border-white/[0.05] bg-black/20 px-3 py-3">
                    <p className="text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
                      {m.comment}
                    </p>
                  </div>
                </div>
              ))}
          </>
          ){/* } */}
          {error && (
            <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-[13px] text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[13px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving && (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
            )}
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-[13px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DriftPage() {
  const accountIdentifier = PathName();
  const role = getUserRole();

  const [drifts, setDrifts] = useState<DriftResource[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<DriftStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DriftResource | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDrifts(
        accountIdentifier,
        page,
        PAGE_SIZE,
        role,
        activeStatus || undefined,
      );
      console.log(data);
      setDrifts(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load drifts");
    } finally {
      setLoading(false);
    }
  }, [accountIdentifier, page, activeStatus]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side search filter
  const filtered = search.trim()
    ? drifts.filter(
        (d) =>
          d.resource_name.toLowerCase().includes(search.toLowerCase()) ||
          d.resource_id.toLowerCase().includes(search.toLowerCase()) ||
          d.resource_type.toLowerCase().includes(search.toLowerCase()) ||
          d.issue_with_resource.toLowerCase().includes(search.toLowerCase()),
      )
    : drifts;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Status counts from current page (approximate)
  const counts = ALL_STATUSES.reduce(
    (acc, s) => {
      acc[s] = drifts.filter((d) => d.status === s).length;
      return acc;
    },
    {} as Record<DriftStatus, number>,
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Drift Resources
            </h1>
            {role === "admin" && (
              <span className="text-[10px] font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                Admin
              </span>
            )}
          </div>
          <p className="text-[13px] text-slate-500">
            {role === "admin"
              ? "All detected resource drifts across the organization."
              : "Drifts assigned to you."}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-[11px] text-slate-600 uppercase tracking-widest">
            Total Drifts
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => {
            setActiveStatus("");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
            activeStatus === ""
              ? "text-white bg-white/[0.08] border-white/[0.12]"
              : "text-slate-500 border-transparent hover:border-white/[0.06] hover:text-slate-300"
          }`}
        >
          All
        </button>
        {ALL_STATUSES.map((s) => {
          const m = STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => {
                setActiveStatus(s);
                setPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                activeStatus === s
                  ? `${m.color} ${m.bg} ${m.border}`
                  : "text-slate-500 border-transparent hover:border-white/[0.06] hover:text-slate-300"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${activeStatus === s ? m.dot : "bg-slate-700"}`}
              />
              {m.label}
              {counts[s] > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${activeStatus === s ? m.bg : "bg-white/[0.04]"}`}
                >
                  {counts[s]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <circle
            cx="6"
            cy="6"
            r="4.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M9.5 9.5L12.5 12.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, type, region…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[13px] text-slate-200 placeholder-slate-600 outline-none focus:border-emerald-500/40 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 2l8 8M10 2L2 10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

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
              {[
                "Resource",
                // "Type",
                "Issue",
                "Status",
                "Detected",
                role === "admin" ? "Group" : "Comment",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-14 text-center">
                  <div className="flex justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-14 text-center text-[13px] text-slate-600"
                >
                  {search ? `No drifts match "${search}"` : "No drifts found."}
                </td>
              </tr>
            ) : (
              filtered.map((d, i) => (
                <tr
                  key={d.id}
                  className={`transition-colors hover:bg-white/[0.02] ${i !== filtered.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                >
                  <td className="px-5 py-3.5">
                    <div className="text-[13px] text-slate-200 font-medium">
                      {d.resource_id}
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                      {d.resource_name && d.resource_name.slice(0, 16)}…
                    </div>
                  </td>
                  {/* <td className="px-5 py-3.5">
                    <span className="text-[11px] font-mono text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                      {d.resource_type}
                    </span>
                  </td> */}
                  <td className="px-5 py-3.5 text-[13px] text-slate-400 font-mono">
                    {d.issue_with_resource}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-slate-500">
                    {formatDate(d.first_seen)}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-slate-500 max-w-[140px] truncate">
                    {role === "admin"
                      ? (d.assigned_to && d.assigned_to.name) || "—"
                      : d.comments[d.comments.length - 1].comment || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelected(d)}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-white/[0.08] text-slate-400 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                    >
                      {role === "admin" ? "Assign" : "Update"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[12px] text-slate-600">
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-[12px] border border-white/[0.06] text-slate-400 hover:border-white/[0.1] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[12px] border transition-all ${
                    p === page
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-white/[0.06] text-slate-500 hover:border-white/[0.1] hover:text-slate-300"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-[12px] border border-white/[0.06] text-slate-400 hover:border-white/[0.1] hover:text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <DriftDrawer
          drift={selected}
          role={role}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
