"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Database, Search, ChevronRight, Server } from "lucide-react";
import PathName from "@/components/PathName";
import { awsScannerApi } from "@/lib/api";
import { PaginationMeta, ResourceDetailResponse } from "@/lib/props";

type Resource = {
  id: string;
  resource_id: string;
  resource_name: string | null;
  service: string;
  region: string;
  resource_type: string;
  configuration: Record<string, unknown>;
  tags: unknown[];
};

const SERVICES = ["ec2", "s3", "iam", "rds", "ecs", "ebs", "kms", "ecr"];

const SERVICE_COLORS: Record<string, string> = {
  ec2: "bg-orange-500/10 text-orange-300 border-orange-500/20",
  s3: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  iam: "bg-red-500/10 text-red-300 border-red-500/20",
  rds: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  ecs: "bg-purple-500/10 text-purple-300 border-purple-500/20",
};

export default function ResourcesDBPage() {
  const path = PathName();
  const [resources, setResources] = useState<ResourceDetailResponse[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>(
    {},
  );

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

        // build counts on first load
        if (pg === 1 && !svc) {
          const counts: Record<string, number> = {};
          res.data.forEach((r: ResourceDetailResponse) => {
            counts[r.service] = (counts[r.service] ?? 0) + 1;
          });
          setServiceCounts(counts);
        }
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
    setExpandedId(null);
  };

  const filteredResources = search
    ? resources.filter(
        (r) =>
          r.resource_id?.toLowerCase().includes(search.toLowerCase()) ||
          r.resource_name?.toLowerCase().includes(search.toLowerCase()),
      )
    : resources;

  const svcColor = (svc: string) =>
    SERVICE_COLORS[svc] ?? "bg-white/[0.05] text-slate-400 border-white/[0.08]";

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
        {SERVICES.filter((s) => serviceCounts[s]).map((svc) => (
          <div
            key={svc}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
          >
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              {svc}
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {serviceCounts[svc]}
            </div>
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
        {SERVICES.map((svc) => (
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

      {/* Table */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0f1117] overflow-hidden">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_24px] gap-0 px-5 py-3 bg-white/[0.02] border-b border-white/[0.06]">
          {["Resource ID", "Name", "Service", "Region", "Type", ""].map(
            (h, i) => (
              <div
                key={i}
                className="text-[10px] text-slate-500 uppercase tracking-wider font-medium"
              >
                {h}
              </div>
            ),
          )}
        </div>

        {loading ? (
          <div>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_24px] px-5 py-4 border-b border-white/[0.04] animate-pulse gap-4"
              >
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-3 bg-white/[0.05] rounded" />
                ))}
                <div />
              </div>
            ))}
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No resources found
          </div>
        ) : (
          filteredResources.map((resource) => (
            <div key={resource.id}>
              <button
                onClick={() =>
                  setExpandedId(expandedId === resource.id ? null : resource.id)
                }
                className="w-full grid grid-cols-[2fr_2fr_1fr_1fr_1fr_24px] px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors text-left items-center gap-4"
              >
                <div className="font-mono text-xs text-slate-300 truncate">
                  {resource.resource_id}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {resource.resource_name ?? "—"}
                </div>
                <div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${svcColor(resource.service)}`}
                  >
                    {resource.service}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-500 truncate">
                  {resource.region}
                </div>
                <div className="font-mono text-xs text-slate-500 truncate">
                  {resource.resource_type ?? "—"}
                </div>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-600 transition-transform ${expandedId === resource.id ? "rotate-90" : ""}`}
                />
              </button>

              {expandedId === resource.id && (
                <div className="border-b border-white/[0.04] bg-black/20 px-5 py-4">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">
                    Configuration
                  </div>
                  <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-48 overflow-y-auto">
                    {JSON.stringify(resource.configuration, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
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
