"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Server } from "lucide-react";
import PathName from "@/components/PathName";
import { awsScannerApi } from "@/lib/api";
import {
  PaginationMeta,
  ResourceDetail,
  ResourceResponse,
  VersionHistory,
} from "@/lib/props";
import { SERVICE_COLORS } from "@/lib/color";
import { formatDate } from "@/components/formatDate";

function initials(name: string) {
  return name
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function getResourceColor(resource_type: string) {
  const hash = resource_type
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return SERVICE_COLORS[hash % SERVICE_COLORS.length];
}

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

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  entity,
  detail,
  loading,
  onClose,
}: {
  entity: ResourceResponse | null;
  detail: ResourceDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  if (!entity) return null;

  const color = getResourceColor(entity.resource_type);
  return (
    <div className="flex flex-col h-full bg-[#0a0a12] border-l border-white/[0.06]">
      {/* Panel header */}
      <div className="flex items-start justify-between p-5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[13px] font-bold ${color.bg} ${color.border} ${color.text}`}
          >
            {initials(entity.resource_name) || "?"}
          </div>
          <div>
            <div className="text-[14px] font-semibold text-white  ">
              {entity.resource_name}
            </div>
            <div className={`text-[11px] font-mono mt-0.5 ${color.text}`}>
              {entity.resource_type}
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

      <div className="flex border-b border-white/[0.06] shrink-0">
        {(["details", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-[11px] font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "details" && (
          // your existing detail content
          <>
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
          </>
        )}
        {activeTab === "history" && <VersionHistory resourceId={entity.id} />}
      </div>
    </div>
  );
}

function VersionHistory({ resourceId }: { resourceId: string }) {
  const [versions, setVersions] = useState<VersionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    awsScannerApi
      .fetchResourceVersions(resourceId)
      .then(setVersions)
      .finally(() => setLoading(false));
  }, [resourceId]);
  console.log(versions);

  if (loading)
    return (
      <div className="animate-pulse space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-white/[0.03]" />
        ))}
      </div>
    );

  return (
    <div className="space-y-3">
      {versions.map((v, i) => (
        <div key={i} className="relative pl-4 border-l border-white/[0.06]">
          {/* Version badge */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-slate-400 font-mono">
              v{v.version_number}
            </span>
            <span className="text-[10px] text-slate-600">
              {formatDate(v.recorded_at)}
            </span>
            {i === 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                current
              </span>
            )}
          </div>

          {/* Changed fields */}
          {Object.keys(v.changed_fields).length === 0 ? (
            <div className="text-[11px] text-slate-600">
              {" "}
              {v.version_number == 1 && "Initial snapshot"}
            </div>
          ) : (
            Object.entries(v.changed_fields).map(([field, change]: any) => (
              <div key={field} className="text-[11px] text-slate-500 font-mono">
                <span className="text-slate-400">{field}</span>
                <span className="text-red-400 line-through ml-2">
                  {JSON.stringify(change.old)}
                </span>
                <span className="text-emerald-400 ml-2">
                  {JSON.stringify(change.new)}
                </span>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function EntityCard({
  entity,
  selected,
  onClick,
}: {
  entity: ResourceResponse;
  selected: boolean;
  onClick: () => void;
}) {
  const ini = initials(entity.resource_name);
  const color = getResourceColor(entity.resource_type);

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
          className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[11px] font-bold shrink-0 ${color.bg} ${color.border} ${color.text}`}
        >
          {ini || "?"}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={`text-[13px] font-medium truncate transition-colors ${selected ? "text-emerald-300" : "text-slate-200 group-hover:text-white"}`}
          >
            {entity.resource_name}
          </div>
          <div className="text-[10px] text-slate-600 font-mono truncate mt-0.5">
            {entity.resource_id}
          </div>
        </div>

        <div
          className={`text-[10px] px-2 py-0.5 rounded border font-mono shrink-0 ${color.bg} ${color.border} ${color.text}`}
        >
          {entity.resource_type}
        </div>
      </div>
    </button>
  );
}

export default function ResourcesDBPage() {
  const path = PathName();
  const [resources, setResources] = useState<ResourceResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>(
    {},
  );
  const [data, setData] = useState<ResourceDetail | null>(null);
  const [selected, setSelected] = useState<ResourceResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchResources = useCallback(
    async (pg: number, svc: string | null) => {
      try {
        setLoading(true);
        setError(null);
        const res = await awsScannerApi.fetch_resources({
          account_identifier: path,
          page: pg,
          page_size: 50,
          service: svc ?? undefined,
        });
        setResources(res.data);
        setPagination(res.pagination);

        setServiceCounts(res.summary.resources_per_service);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load resources");
      } finally {
        setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    fetchResources(page, activeService);
  }, [page, activeService, fetchResources]);

  const handleServiceClick = (svc: string | null) => {
    setActiveService(svc);
    setPage(1);
  };

  const filteredResources = search
    ? resources.filter(
        (r) =>
          r.resource_id?.toLowerCase().includes(search.toLowerCase()) ||
          r.resource_name?.toLowerCase().includes(search.toLowerCase()),
      )
    : resources;

  const handleOpenResourceDetails = async (resource: ResourceResponse) => {
    setSelected(resource);
    setData(null);
    setDetailLoading(true);
    try {
      const data = await awsScannerApi.fetchResourceDetail(resource.id);
      console.log(data);
      setData(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load resources");
      setData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const showPanel = selected !== null;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              Cloud resources
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {pagination
                ? `${pagination.total} total resources`
                : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">
            Total
          </div>
          <div className="mt-1 text-xl font-semibold text-white">
            {pagination?.total ?? "—"}
          </div>
        </div>
        {Object.entries(serviceCounts).map(([svc, count]) => (
          <div
            key={svc}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
          >
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              {svc}
            </div>
            <div className="mt-1 text-xl font-semibold text-white">{count}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => handleServiceClick(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            !activeService
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
              : "text-slate-400 border-white/[0.06] hover:border-white/[0.12] hover:text-slate-200"
          }`}
        >
          All
        </button>
        {Object.keys(serviceCounts).map((svc) => (
          <button
            key={svc}
            onClick={() => handleServiceClick(svc)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              activeService === svc
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                : "text-slate-400 border-white/[0.06] hover:border-white/[0.12] hover:text-slate-200"
            }`}
          >
            {svc.toUpperCase()}
          </button>
        ))}

        <div className="ml-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            type="text"
            placeholder="Search by ID or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs text-slate-300 placeholder-slate-600 w-56 focus:outline-none focus:border-emerald-500/30"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

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
            {!loading && filteredResources.length === 0 && (
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
                    {resources.length === 0
                      ? "No Resources found"
                      : "No matches"}
                  </div>
                  <div className="text-slate-600 text-[12px] mt-1">
                    {resources.length === 0
                      ? "No resources found for this account"
                      : "Try adjusting your search or filter"}
                  </div>
                </div>
              </div>
            )}

            {/* Entity cards */}
            {!loading &&
              filteredResources.map((entity) => (
                <EntityCard
                  key={entity.id}
                  entity={entity}
                  selected={selected?.id === entity.id}
                  onClick={() => handleOpenResourceDetails(entity)}
                />
              ))}
          </div>
        </div>

        {/* Detail panel */}
        {showPanel && (
          <div className="flex-1 overflow-hidden border-l border-white/[0.06]">
            <DetailPanel
              entity={selected}
              detail={data}
              loading={detailLoading}
              onClose={() => {
                setSelected(null);
                setData(null);
              }}
            />
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {(page - 1) * 50 + 1}–
            {Math.min(page * 50, pagination.total)} of {pagination.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs text-slate-400 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← Prev
            </button>
            {Array.from(
              { length: Math.min(pagination.total_pages, 7) },
              (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition ${
                      p === page
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                        : "border-white/[0.06] text-slate-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    {p}
                  </button>
                );
              },
            )}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === pagination.total_pages}
              className="px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs text-slate-400 hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
