"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  RefreshCw,
  PlusCircle,
  Clock3,
  Database,
  ChevronRight,
  Tag,
} from "lucide-react";
import { awsScannerApi } from "@/lib/api";
import { ResourceItem, ResourceSummaryResponse } from "@/lib/props";

function groupByService(resources: ResourceItem[]) {
  return resources.reduce<Record<string, ResourceItem[]>>((acc, r) => {
    const svc = r.service || "unknown";
    if (!acc[svc]) acc[svc] = [];
    acc[svc].push(r);
    return acc;
  }, {});
}

function ResourceRow({
  resource,
  type,
  summaryId,
}: {
  resource: ResourceItem;
  type: "updated" | "added";
  summaryId: string;
}) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const fetched = useRef(false);

  async function toggle() {
    setOpen((prev) => !prev);
    if (!fetched.current) {
      fetched.current = true;
      setLoadingConfig(true);
      try {
        const res = await awsScannerApi.fetch_resource_detail({
          summaryId,
          resourceId: resource.resource_id,
        });
        setConfig(res.configuration ?? res);
      } catch (e) {
        console.error(e);
        setConfig({ error: "Failed to load configuration" });
      } finally {
        setLoadingConfig(false);
      }
    }
  }

  const isUpdated = type === "updated";

  return (
    <div>
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-all text-left border-t border-white/[0.04] first:border-t-0"
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
          ${
            isUpdated
              ? "bg-orange-500/10 border border-orange-500/10"
              : "bg-emerald-500/10 border border-emerald-500/10"
          }`}
        >
          {isUpdated ? (
            <RefreshCw className="w-4 h-4 text-orange-300" />
          ) : (
            <Database className="w-4 h-4 text-emerald-300" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm text-slate-200 truncate font-mono">
            {resource.resource_id}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {/* {resource.resource_type} ·{" "} */}
            {isUpdated ? "Configuration changed" : "Newly discovered"}
          </div>
        </div>

        <ChevronRight
          className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/[0.04] bg-[#0d0d14] px-5 py-4">
          {loadingConfig ? (
            <p className="text-xs text-slate-500">Fetching configuration...</p>
          ) : (
            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(config, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ServiceGroup({
  service,
  resources,
  type,
  summaryId,
}: {
  service: string;
  resources: ResourceItem[];
  type: "updated" | "added";
  summaryId: string;
}) {
  return (
    <div className="border-b border-white/[0.04] last:border-b-0">
      <div className="px-5 py-2.5 flex items-center gap-2 bg-white/[0.02]">
        <Tag className="w-3 h-3 text-slate-600" />
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
          {service}
        </span>
        <span className="ml-1 text-[10px] text-slate-600 border border-white/[0.06] rounded-full px-2 py-0.5">
          {resources.length}
        </span>
      </div>
      {resources.map((r) => (
        <ResourceRow
          key={`${r.service}-${r.resource_id}`}
          resource={r}
          type={type}
          summaryId={summaryId}
        />
      ))}
    </div>
  );
}

function ResourceSection({
  title,
  subtitle,
  count,
  resources,
  type,
  summaryId,
}: {
  title: string;
  subtitle: string;
  count: number;
  resources: ResourceItem[];
  type: "updated" | "added";
  summaryId: string;
}) {
  const grouped = groupByService(resources);
  const isUpdated = type === "updated";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden mb-8">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h2
            className={`text-sm font-medium ${isUpdated ? "text-orange-300" : "text-emerald-300"}`}
          >
            {title}
          </h2>
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        </div>
        <span className="text-xs text-slate-500">{count} resources</span>
      </div>

      {count === 0 ? (
        <div className="p-6 text-sm text-slate-500">
          No {title.toLowerCase()} found
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([svc, items]) => (
            <ServiceGroup
              key={svc}
              service={svc}
              resources={items}
              type={type}
              summaryId={summaryId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ResourceSummary() {
  const params = useParams();
  const resourceSummaryID = params.summary_id as string;
  const [data, setData] = useState<ResourceSummaryResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceSummaryID) return;
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await awsScannerApi.fetch_resources_summary_with_ID({
          resourceSummaryID,
        });
        setData(res);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load summary");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [resourceSummaryID]);

  if (loading)
    return (
      <div className="p-6 text-slate-400 text-sm">
        Loading resource summary...
      </div>
    );
  if (!data)
    return (
      <div className="p-6 text-red-400 text-sm">
        {error ?? "Resource summary not found"}
      </div>
    );

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Resource scan summary
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            View scanned resources and configuration changes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
          <div className="text-slate-500 text-xs uppercase tracking-wider">
            Total resources
          </div>
          <div className="mt-3 text-3xl font-semibold">
            {data.total_resources_fetched_count}
          </div>
        </div>
        <div className="rounded-2xl border border-orange-500/10 bg-orange-500/[0.03] p-5">
          <div className="flex items-center gap-2 text-orange-300 text-xs uppercase tracking-wider">
            <RefreshCw className="w-3.5 h-3.5" /> Updated resources
          </div>
          <div className="mt-3 text-3xl font-semibold text-orange-300">
            {data.updated_resources_count}
          </div>
        </div>
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-5">
          <div className="flex items-center gap-2 text-emerald-300 text-xs uppercase tracking-wider">
            <PlusCircle className="w-3.5 h-3.5" /> New resources
          </div>
          <div className="mt-3 text-3xl font-semibold text-emerald-300">
            {data.newly_added_resources_count}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 mb-8 flex items-center gap-2 text-slate-400 text-sm">
        <Clock3 className="w-4 h-4" />
        <span>
          Scan completed at {new Date(data.fetched_date).toLocaleString()}
        </span>
      </div>

      <ResourceSection
        title="Updated resources"
        subtitle="Resources whose configuration changed"
        count={data.updated_resources_count}
        resources={data.updated_resource_ids ?? []}
        type="updated"
        summaryId={resourceSummaryID}
      />

      <ResourceSection
        title="Newly added resources"
        subtitle="Newly discovered cloud resources"
        count={data.newly_added_resources_count}
        resources={data.newly_added_resource_ids ?? []}
        type="added"
        summaryId={resourceSummaryID}
      />
    </div>
  );
}
