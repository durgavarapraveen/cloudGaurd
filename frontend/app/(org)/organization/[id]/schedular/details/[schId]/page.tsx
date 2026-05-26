"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { schedular } from "@/lib/api";
import { SchedulerDetail } from "@/lib/props";
import { formatFetchTime } from "@/components/FormatTime";
import { formatStopDate } from "@/components/formatStopDate";

function formatDate(dt: string) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFrequency(hours: number) {
  if (hours < 24) return `Every ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Every ${days} day${days > 1 ? "s" : ""}`;
}

export default function SchedulerDetailPage({
  params,
  schedulerId,
}: {
  params?: Promise<{ id: string; schId: string }>;
  schedulerId?: string;
}) {
  const resolvedParams = params ? use(params) : null;
  const schId = schedulerId ?? resolvedParams?.schId ?? "";
  const router = useRouter();

  const [scheduler, setScheduler] = useState<SchedulerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await schedular.getSchedularDetail(schId);
        console.log(data);
        setScheduler(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    if (schId) load();
  }, [schId]);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error || !scheduler) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-[13px] text-red-400">
          {error ?? "Scheduler not found"}
        </div>
      </div>
    );
  }

  const runs = Array.isArray(scheduler.resource_summary)
    ? scheduler.resource_summary
    : scheduler.resource_summary
      ? [scheduler.resource_summary] // ← wrap single object in array
      : [];
  const totalFetched = runs.reduce(
    (acc, r) => acc + r.total_resources_fetched_count,
    0,
  );
  const totalAdded = runs.reduce(
    (acc, r) => acc + r.newly_added_resources_count,
    0,
  );
  const totalUpdated = runs.reduce(
    (acc, r) => acc + r.updated_resources_count,
    0,
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-300 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9 2.5L4.5 7L9 11.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Schedulers
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              {scheduler.name}
            </h1>
            {scheduler.is_active ? (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                Inactive
              </span>
            )}
          </div>
          <p className="text-[13px] text-slate-500">
            {formatFrequency(scheduler.frequency)} · Fetch at{" "}
            {formatDate(scheduler.fetch_time)} · Stops{" "}
            {formatDate(scheduler.stop_date)}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total Runs", value: runs.length, color: "text-white" },
          {
            label: "Resources Fetched",
            value: totalFetched,
            color: "text-emerald-400",
          },
          { label: "Newly Added", value: totalAdded, color: "text-blue-400" },
          { label: "Updated", value: totalUpdated, color: "text-orange-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#0d0d14] border border-white/[0.06] rounded-xl px-5 py-4"
          >
            <div className={`text-2xl font-bold mb-1 ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-[11px] text-slate-500 uppercase tracking-widest">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Scheduler config */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 mb-6">
        <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-4">
          Configuration
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Frequency", value: formatFrequency(scheduler.frequency) },
            {
              label: "Fetch Time",
              value: formatFetchTime(scheduler.fetch_time),
            },
            { label: "Stop Date", value: formatStopDate(scheduler.stop_date) },
            { label: "Scheduler ID", value: scheduler.id.slice(0, 8) + "…" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-[11px] text-slate-600 uppercase tracking-widest mb-1">
                {item.label}
              </div>
              <div className="text-[13px] text-slate-300 font-mono">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {scheduler.job_running && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-slate-600 uppercase tracking-widest mb-1">
              Job Status
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${scheduler.job_running ? "bg-emerald-400 animate-pulse" : "bg-slate-600"}`}
              />
              <span
                className={`text-[13px] font-mono ${scheduler.job_running ? "text-emerald-400" : "text-slate-500"}`}
              >
                {scheduler.job_running ? "Running" : "Stopped"}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-600 uppercase tracking-widest mb-1">
              Next Trigger
            </div>
            <div className="text-[13px] text-slate-300 font-mono">
              {scheduler.job_running && scheduler.next_run
                ? formatDate(scheduler.next_run)
                : "—"}
            </div>
            {scheduler.job_running && (
              <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
                {scheduler.trigger}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Run history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-white">Run History</h2>
          <span className="text-[12px] text-slate-500">
            {runs.length} run{runs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl px-5 py-12 text-center text-[13px] text-slate-600">
            No runs yet — this scheduler hasn&apos;t executed any fetches.
          </div>
        ) : (
          <div className="space-y-2">
            {[...runs]
              .sort(
                (a, b) =>
                  new Date(b.fetched_date).getTime() -
                  new Date(a.fetched_date).getTime(),
              )
              .map((run, i) => {
                const isExpanded = expandedRun === run.id;
                return (
                  <div
                    key={run.id}
                    className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden"
                  >
                    {/* Row */}
                    <button
                      onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      {/* Run number */}
                      <span className="text-[11px] font-mono text-slate-600 w-6">
                        #{runs.length - i}
                      </span>

                      {/* Date */}
                      <span className="text-[13px] text-slate-300 flex-1">
                        {formatDate(run.fetched_date)}
                      </span>

                      {/* Provider */}
                      <span className="text-[11px] text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded font-mono">
                        {run.provider}
                      </span>

                      {/* Stats */}
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
                          <span className="text-emerald-400 font-medium">
                            {run.total_resources_fetched_count}
                          </span>
                          fetched
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
                          <span className="text-blue-400 font-medium">
                            +{run.newly_added_resources_count}
                          </span>
                          new
                        </span>
                        <span className="flex items-center gap-1.5 text-[12px] text-slate-400">
                          <span className="text-orange-400 font-medium">
                            ~{run.updated_resources_count}
                          </span>
                          updated
                        </span>
                      </div>

                      {/* Expand chevron */}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        className={`text-slate-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path
                          d="M3 5L7 9L11 5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-white/[0.04] px-5 py-4 space-y-4">
                        {run.newly_added_resource_ids?.length > 0 && (
                          <div>
                            <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">
                              Newly Added Resource IDs
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {run.newly_added_resource_ids.map((id, j) => (
                                <span
                                  key={j}
                                  className="text-[11px] font-mono text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded"
                                >
                                  {String(id)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {run.updated_resource_ids?.length > 0 && (
                          <div>
                            <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">
                              Updated Resource IDs
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {run.updated_resource_ids.map((id, j) => (
                                <span
                                  key={j}
                                  className="text-[11px] font-mono text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded"
                                >
                                  {String(id)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {run.newly_added_resource_ids?.length === 0 &&
                          run.updated_resource_ids?.length === 0 && (
                            <p className="text-[13px] text-slate-600">
                              No resource changes in this run.
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
