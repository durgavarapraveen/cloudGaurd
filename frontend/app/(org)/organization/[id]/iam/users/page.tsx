"use client";

import React, { useCallback, useEffect, useState } from "react";
import PathName from "@/components/PathName";
import { getErrorMessage } from "@/lib/errors";
import { iam } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IamEntity {
  name: string;
  id: string;
  resource_type: string;
  resource_id: string;
}

export interface ResourceDetail {
  id: string;
  resource_name: string;
  resource_type: string;
  resource_id: string;
  [key: string]: unknown; // backend may return any extra fields
}

// ─── API ──────────────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  role: {
    label: "Role",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  user: {
    label: "User",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M3 12c0-2.209 1.791-4 4-4s4 1.791 4 4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="11" cy="11" r="2.5" fill="#0ea5e9" opacity="0.3" />
      </svg>
    ),
  },
  group: {
    label: "Group",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10" cy="4" r="2" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M1 12c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M10 8.5c1.5 0 3 1 3 3"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  policy: {
    label: "Policy",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect
          x="2"
          y="1.5"
          width="10"
          height="11"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M4.5 5h5M4.5 7.5h5M4.5 10h3"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
};

function resolveType(resource_type: string, name: string) {
  const t = resource_type.toLowerCase();
  if (t.includes("role")) return TYPE_META.role;
  if (t.includes("user")) return TYPE_META.user;
  if (t.includes("group")) return TYPE_META.group;
  if (t.includes("policy")) return TYPE_META.policy;
  // fallback: try name
  const n = name.toLowerCase();
  if (n.includes("role")) return TYPE_META.role;
  if (n.includes("user")) return TYPE_META.user;
  if (n.includes("group")) return TYPE_META.group;
  return TYPE_META.role;
}

function initials(name: string) {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Render unknown detail fields as a readable table
function DetailFields({ data }: { data: ResourceDetail }) {
  const skip = new Set(["id", "resource_name", "resource_type", "resource_id"]);
  const extra = Object.entries(data).filter(([k]) => !skip.has(k));
  return (
    <div className="space-y-1">
      {[
        ["Resource Name", data.resource_name],
        ["Resource Type", data.resource_type],
        ["Resource ID", data.resource_id],
        ...extra,
      ].map(([key, val]) => (
        <div
          key={String(key)}
          className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0"
        >
          <div className="w-36 shrink-0 text-[11px] text-slate-500 pt-0.5">
            {String(key)}
          </div>
          <div className="flex-1 text-[12px] text-slate-300 font-mono break-all">
            {val === null || val === undefined ? (
              <span className="text-slate-600 italic">—</span>
            ) : typeof val === "object" ? (
              <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">
                {JSON.stringify(val, null, 2)}
              </pre>
            ) : (
              String(val)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4">
      <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div>
        <div className="text-xl font-semibold font-mono text-white">
          {value}
        </div>
        <div className="text-[11px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

// ─── Entity card ──────────────────────────────────────────────────────────────

function EntityCard({
  entity,
  selected,
  onClick,
}: {
  entity: IamEntity;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = resolveType(entity.resource_type, entity.name);
  const ini = initials(entity.name);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 group
        ${
          selected
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-[#0d0d14] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]"
        }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[11px] font-bold shrink-0 ${meta.bg} ${meta.color}`}
        >
          {ini || "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={`text-[13px] font-medium truncate transition-colors ${selected ? "text-emerald-300" : "text-slate-200 group-hover:text-white"}`}
          >
            {entity.name}
          </div>
          <div className="text-[10px] text-slate-600 font-mono truncate mt-0.5">
            {entity.resource_id}
          </div>
        </div>

        <div
          className={`text-[10px] px-2 py-0.5 rounded border font-mono shrink-0 ${meta.bg} ${meta.color}`}
        >
          {meta.label}
        </div>
      </div>
    </button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  entity,
  detail,
  loading,
  onClose,
}: {
  entity: IamEntity | null;
  detail: ResourceDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!entity) return null;
  const meta = resolveType(entity.resource_type, entity.name);

  return (
    <div className="flex flex-col h-full bg-[#0a0a12] border-l border-white/[0.06]">
      {/* Panel header */}
      <div className="flex items-start justify-between p-5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[13px] font-bold ${meta.bg} ${meta.color}`}
          >
            {initials(entity.name) || "?"}
          </div>
          <div>
            <div className="text-[14px] font-semibold text-white">
              {entity.name}
            </div>
            <div className={`text-[11px] font-mono mt-0.5 ${meta.color}`}>
              {meta.label}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Quick info strip */}
      <div className="grid grid-cols-2 gap-px border-b border-white/[0.06] shrink-0">
        {[
          ["Internal ID", entity.id],
          ["Resource ID", entity.resource_id],
          ["Type", entity.resource_type],
        ].map(([label, val]) => (
          <div key={label} className="px-5 py-3 bg-[#0d0d14]">
            <div className="text-[10px] text-slate-600 uppercase tracking-widest">
              {label}
            </div>
            <div className="text-[12px] text-slate-300 font-mono mt-1 truncate">
              {val}
            </div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded-lg bg-white/[0.03] animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        )}

        {!loading && detail && (
          <div>
            <div className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">
              Resource Details
            </div>
            <DetailFields data={detail} />
          </div>
        )}

        {!loading && !detail && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-600">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M8 5v4M8 11v.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="text-[12px] text-slate-600">
              Failed to load details
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IamEntitiesPage() {
  const cloudIdentifier = PathName() ?? "";

  const [entities, setEntities] = useState<IamEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<IamEntity | null>(null);
  const [detail, setDetail] = useState<ResourceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Load entities on mount
  const loadEntities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await iam.fetchIamEntities(cloudIdentifier);
      console.log(data);
      setEntities(data);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load IAM entities"));
    } finally {
      setLoading(false);
    }
  }, [cloudIdentifier]);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  // Load resource detail when entity selected
  async function selectEntity(entity: IamEntity) {
    setSelected(entity);
    setDetail(null);
    setDetailLoading(true);
    try {
      const data = await iam.fetchResourceDetail(entity.id);
      setDetail(data);
    } catch (e: unknown) {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  // Derived stats
  const typeCounts = entities.reduce<Record<string, number>>((acc, e) => {
    const key = resolveType(e.resource_type, e.name).label;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const uniqueTypes = Array.from(
    new Set(entities.map((e) => resolveType(e.resource_type, e.name).label)),
  );

  const filtered = entities.filter((e) => {
    const typeMeta = resolveType(e.resource_type, e.name);
    if (typeFilter !== "ALL" && typeMeta.label !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.resource_id.toLowerCase().includes(q) ||
        e.resource_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const showPanel = selected !== null;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="px-8 pt-8 pb-4 shrink-0 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">
              IAM Entities
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">
              Roles, users, groups &amp; policies —{" "}
              <span className="font-mono text-slate-400">
                {cloudIdentifier || "no account"}
              </span>
            </p>
          </div>
          <button
            onClick={loadEntities}
            disabled={loading}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all border
              ${
                loading
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500/50 cursor-not-allowed"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95"
              }`}
          >
            {loading ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                Loading…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M10 6A4 4 0 112 6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M10 2v4H6"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>

        {/* Stat cards */}
        {!loading && entities.length > 0 && (
          <div className="grid grid-cols-5 gap-3">
            <StatCard
              label="Total Entities"
              value={entities.length}
              icon={
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle
                    cx="7.5"
                    cy="5"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M2 14c0-3.038 2.462-5.5 5.5-5.5S13 10.962 13 14"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />
            {Object.entries(typeCounts).map(([type, count]) => {
              const meta =
                Object.values(TYPE_META).find((m) => m.label === type) ??
                TYPE_META.role;
              return (
                <StatCard
                  key={type}
                  label={`${type}s`}
                  value={count}
                  icon={meta.icon}
                />
              );
            })}
          </div>
        )}

        {/* Filters */}
        {!loading && entities.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
              >
                <circle
                  cx="5"
                  cy="5"
                  r="3.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M8 8L10.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
              <input
                type="text"
                placeholder="Search entities…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 w-56 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1">
              {["ALL", ...uniqueTypes].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                    typeFilter === t
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {t === "ALL" ? "All" : t}
                </button>
              ))}
            </div>

            <div className="ml-auto text-[11px] text-slate-600 font-mono">
              {filtered.length} / {entities.length}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-8 mb-4 border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-[13px] text-red-400 shrink-0">
          {error}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Entity list */}
        <div
          className={`flex flex-col overflow-hidden transition-all duration-300 ${showPanel ? "w-[360px] shrink-0" : "flex-1"}`}
        >
          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-2">
            {/* Loading skeletons */}
            {loading &&
              [...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-[#0d0d14] border border-white/[0.06] animate-pulse"
                  style={{ animationDelay: `${i * 60}ms` }}
                />
              ))}

            {/* Empty */}
            {!loading && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3 border border-dashed border-white/[0.08] rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-slate-600">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect
                      x="3"
                      y="3"
                      width="14"
                      height="14"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M7 10h6M10 7v6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-slate-400 text-[14px]">
                    {entities.length === 0
                      ? "No IAM entities found"
                      : "No matches"}
                  </div>
                  <div className="text-slate-600 text-[12px] mt-1">
                    {entities.length === 0
                      ? "No IAM resources found for this account"
                      : "Try adjusting your search or filter"}
                  </div>
                </div>
              </div>
            )}

            {/* Entity cards */}
            {!loading &&
              filtered.map((entity) => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  selected={selected?.id === entity.id}
                  onClick={() => selectEntity(entity)}
                />
              ))}
          </div>
        </div>

        {/* Detail panel */}
        {showPanel && (
          <div className="flex-1 overflow-hidden border-l border-white/[0.06]">
            <DetailPanel
              entity={selected}
              detail={detail}
              loading={detailLoading}
              onClose={() => {
                setSelected(null);
                setDetail(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
