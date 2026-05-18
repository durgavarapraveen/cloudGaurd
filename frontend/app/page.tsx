"use client";

import { useCallback, useEffect, useState } from "react";
import {
  awsApi,
  CloudInventoryResource,
  dashboardApi,
  DashboardScan,
  DashboardScanDetail,
  ScanResult,
} from "@/lib/api";
import ScoreGauge from "@/components/Scoregauge";
import MetricCard from "@/components/MetricCard";
import SeverityBar from "@/components/SeverityBadge";
import FindingsTable from "@/components/FindingsTable";
import { Toaster } from "react-hot-toast";
import { getErrorMessage } from "@/lib/errors";

export default function DashboardPage() {
  const [data, setData] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<DashboardScan[]>([]);
  const [selectedScan, setSelectedScan] = useState<DashboardScanDetail | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "findings">("overview");

  const loadScanHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await dashboardApi.recentScans(100);
      setScanHistory(result.scans ?? []);
      console.log(result);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load scan history"));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScanHistory();
  }, [loadScanHistory]);

  async function runScan() {
    setScanning(true);
    setError(null);
    try {
      const result = await awsApi.scan();
      setData(result);
      await loadScanHistory();
      setTab("overview");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Scan failed"));
    } finally {
      setScanning(false);
    }
  }

  async function openScanDetails(scanId: string) {
    setDetailsLoading(true);
    setError(null);
    try {
      const result = await dashboardApi.scanDetails(scanId);
      setSelectedScan(result);
      console.log(result);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load scan details"));
    } finally {
      setDetailsLoading(false);
    }
  }

  const s = data?.summary;
  const latestScan = scanHistory[0];

  return (
    <div className="p-8 space-y-8 relative z-10">
      {/* Page header */}
      <div className="fade-up flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Security Posture
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            AWS account scan —{" "}
            {data?.scan_metadata?.account_id ??
              latestScan?.account_id ??
              "not scanned yet"}
          </p>
        </div>

        <button
          onClick={runScan}
          disabled={scanning}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all border
            ${
              scanning
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500/50 cursor-not-allowed"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95"
            }`}
        >
          {scanning ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle
                  cx="6.5"
                  cy="6.5"
                  r="5.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path
                  d="M4.5 6.5L6 8L8.5 5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Run Scan
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="fade-up border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-[13px] text-red-400">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!data && !scanning && !historyLoading && scanHistory.length === 0 && (
        <div className="fade-up flex flex-col items-center justify-center py-24 text-center space-y-4 border border-dashed border-white/[0.08] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle
                cx="11"
                cy="11"
                r="9"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <path
                d="M7 11L10 14L15 8"
                stroke="#334155"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-slate-400 text-[14px]">No scan data</div>
            <div className="text-slate-600 text-[12px] mt-1">
              Click Run Scan to fetch your AWS security posture
            </div>
          </div>
        </div>
      )}

      <ScanHistory
        scans={scanHistory}
        loading={historyLoading}
        selectedScanId={selectedScan?.scan.id}
        onRefresh={loadScanHistory}
        onOpen={openScanDetails}
      />

      {(selectedScan || detailsLoading) && (
        <ScanDetailPanel
          detail={selectedScan}
          loading={detailsLoading}
          onClose={() => setSelectedScan(null)}
        />
      )}

      {/* Scanning skeleton */}
      {scanning && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 h-24 animate-pulse"
              />
            ))}
          </div>
          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl h-40 animate-pulse" />
        </div>
      )}

      {/* Results */}
      {data && s && !scanning && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="fade-up flex gap-1 border-b border-white/[0.06]">
            {(["overview", "findings"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-[12px] font-medium capitalize border-b-2 -mb-px transition-colors
                  ${
                    tab === t
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
              >
                {t}
                {t === "findings" && (
                  <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-mono">
                    {s.failed}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="space-y-6">
              {/* Score + metrics */}
              <div className="fade-up fade-up-delay-1 grid grid-cols-5 gap-4">
                {/* Score gauge */}
                <div className="col-span-1 bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6 flex items-center justify-center">
                  <ScoreGauge score={s.score} />
                </div>

                {/* Metrics */}
                <div className="col-span-4 grid grid-cols-4 gap-4">
                  <MetricCard
                    label="Total checks"
                    value={s.total}
                    sub="rules evaluated"
                  />
                  <MetricCard
                    label="Passed"
                    value={s.passed}
                    sub={`${s.total > 0 ? ((s.passed / s.total) * 100).toFixed(0) : 0}% of checks`}
                    accent="green"
                  />
                  <MetricCard
                    label="Failed"
                    value={s.failed}
                    sub="need remediation"
                    accent="red"
                  />
                  <MetricCard
                    label="Critical"
                    value={s.by_severity?.CRITICAL ?? 0}
                    sub="immediate action"
                    accent="red"
                  />
                </div>
              </div>

              {/* Severity breakdown + Service breakdown */}
              <div className="fade-up fade-up-delay-2 grid grid-cols-2 gap-4">
                {/* Severity */}
                <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-4">
                    Failed by severity
                  </div>
                  <SeverityBar bySeverity={s.by_severity ?? {}} />
                </div>

                {/* Service */}
                <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-4">
                    Checks by service
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(s.by_service ?? {}).map(([svc, count]) => {
                      const max = Math.max(
                        ...Object.values(s.by_service ?? {}),
                      );
                      return (
                        <div key={svc} className="flex items-center gap-3">
                          <div className="w-14 text-right text-[11px] font-mono text-slate-500 uppercase">
                            {svc}
                          </div>
                          <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-slate-400 rounded-full transition-all duration-700"
                              style={{
                                width: `${max > 0 ? (count / max) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <div className="w-6 text-right text-[12px] font-mono text-slate-400">
                            {count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Scan metadata */}
              {data.scan_metadata && (
                <div className="fade-up fade-up-delay-3 border border-white/[0.04] rounded-xl p-4 flex gap-8 text-[11px]">
                  <Meta label="Account" value={data.scan_metadata.account_id} />
                  <Meta
                    label="Regions"
                    value={data.scan_metadata.regions?.join(", ")}
                  />
                  <Meta
                    label="Scanned"
                    value={new Date(
                      data.scan_metadata.scanned_at,
                    ).toLocaleString()}
                  />
                  <Meta
                    label="Resources"
                    value={String(data.findings?.length ?? 0) + " findings"}
                  />
                </div>
              )}
            </div>
          )}

          {tab === "findings" && (
            <div className="fade-up">
              <FindingsTable findings={data.findings ?? []} />
            </div>
          )}
        </div>
      )}
      <Toaster />
    </div>
  );
}

function ScanHistory({
  scans,
  loading,
  selectedScanId,
  onRefresh,
  onOpen,
}: {
  scans: DashboardScan[];
  loading: boolean;
  selectedScanId?: string;
  onRefresh: () => void;
  onOpen: (scanId: string) => void;
}) {
  return (
    <section className="fade-up bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-[13px] font-medium text-slate-200">
            Scan history
          </h2>
          <p className="text-[11px] text-slate-600 mt-1">
            {loading
              ? "Loading saved scans"
              : `${scans.length} saved scan${scans.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 rounded-md border border-white/[0.08] text-[11px] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-md bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      ) : scans.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-slate-500">
          No scans found in the database.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-600">
              <tr>
                <th className="px-5 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Score</th>
                <th className="px-4 py-3 font-medium text-right">Checks</th>
                <th className="px-4 py-3 font-medium text-right">Failed</th>
                <th className="px-4 py-3 font-medium text-right">Critical</th>
                <th className="px-5 py-3 font-medium">Regions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {scans.map((scan) => (
                <tr
                  key={scan.id}
                  onClick={() => onOpen(scan.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedScanId === scan.id
                      ? "bg-emerald-500/[0.06]"
                      : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="px-5 py-3 text-[12px] font-mono text-slate-400">
                    {formatDate(scan.completed_at ?? scan.started_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[12px] text-slate-300">
                      {scan.account_name ?? scan.account_id ?? "Unknown"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-600">
                      {scan.cloud_account_id}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] uppercase text-slate-500">
                    {scan.provider ?? "AWS"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-400">
                      {scan.scan_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] font-mono text-slate-300">
                    {getScore(scan)}%
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] font-mono text-slate-400">
                    {scan.total_checks}
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] font-mono text-red-400">
                    {scan.total_failed}
                  </td>
                  <td className="px-4 py-3 text-right text-[12px] font-mono text-red-300">
                    {scan.critical_count}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-slate-500">
                    {scan.regions_scanned.length > 0
                      ? scan.regions_scanned.join(", ")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ScanDetailPanel({
  detail,
  loading,
  onClose,
}: {
  detail: DashboardScanDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<"findings" | "inventory">("findings");
  const [service, setService] = useState<string>("ALL");
  console.log(detail);
  const inventory = detail?.inventory ?? [];
  const services = Object.keys(detail?.inventory_by_service ?? {}).sort();
  const visibleInventory =
    service === "ALL"
      ? inventory
      : inventory.filter((resource) => resource.service === service);

  console.log(visibleInventory);

  if (loading && !detail) {
    return (
      <section className="fade-up border border-white/[0.06] rounded-xl bg-[#0d0d14] p-5">
        <div className="h-5 w-48 rounded bg-white/[0.05] animate-pulse" />
        <div className="mt-5 grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!detail) return null;

  const scan = detail.scan;

  return (
    <section className="fade-up border border-white/[0.06] rounded-xl bg-[#0d0d14] overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="text-[11px] text-slate-600 uppercase tracking-widest">
            Selected scan
          </div>
          <h2 className="mt-1 text-[15px] font-medium text-slate-200">
            {scan.account_name ?? scan.account_id ?? "AWS account"}
          </h2>
          <div className="mt-1 text-[11px] font-mono text-slate-500">
            {formatDate(scan.completed_at ?? scan.started_at)} - {scan.id}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border border-white/[0.08] px-3 py-1.5 text-[11px] text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-5 gap-3 px-5 py-4 border-b border-white/[0.06]">
        <MiniStat label="Resources" value={detail.counts.inventory} />
        <MiniStat label="Findings" value={detail.counts.findings} />
        <MiniStat label="Failed" value={scan.total_failed} accent="red" />
        <MiniStat label="Critical" value={scan.critical_count} accent="red" />
        <MiniStat label="Score" value={`${getScore(scan)}%`} accent="green" />
      </div>

      <div className="px-5 py-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["findings", "inventory"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setView(item)}
              className={`rounded-md border px-3 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                view === item
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.06] text-slate-500 hover:text-slate-300"
              }`}
            >
              {item}
            </button>
          ))}

          {view === "inventory" && services.length > 0 && (
            <select
              value={service}
              onChange={(event) => setService(event.target.value)}
              className="ml-auto rounded-md border border-white/[0.06] bg-[#0d0d14] px-2 py-1.5 text-[11px] font-mono text-slate-400 outline-none"
            >
              <option value="ALL">All services</option>
              {services.map((svc) => (
                <option key={svc} value={svc}>
                  {svc.toUpperCase()}
                </option>
              ))}
            </select>
          )}
        </div>

        {view === "findings" ? (
          <FindingsTable findings={detail.findings} showPassed />
        ) : (
          <InventoryTable resources={visibleInventory} />
        )}
      </div>
    </section>
  );
}

function InventoryTable({
  resources,
}: {
  resources: CloudInventoryResource[];
}) {
  const [selected, setSelected] = useState<CloudInventoryResource | null>(null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4">
      <div className="min-w-0 overflow-hidden rounded-xl border border-white/[0.06]">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-600">
            <tr>
              <th className="px-4 py-2.5 font-medium">Resource</th>
              <th className="px-4 py-2.5 font-medium">Service</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Region</th>
              <th className="px-4 py-2.5 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {resources.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-600"
                >
                  No inventory resources were saved for this scan.
                </td>
              </tr>
            )}
            {resources.map((resource) => (
              <tr
                key={resource.id}
                onClick={() => setSelected(resource)}
                className={`cursor-pointer transition-colors ${
                  selected?.id === resource.id
                    ? "bg-emerald-500/[0.06]"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-mono text-[11px] text-slate-300 truncate">
                    {resource.resource_name ?? resource.resource_id}
                  </div>
                  <div className="font-mono text-[10px] text-slate-600 truncate">
                    {resource.resource_id}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500">
                  {resource.service}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                  {resource.resource_type}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                  {resource.region ?? "-"}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                  {formatDate(resource.last_seen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
        {selected ? (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-600">
                Configuration
              </div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-300">
                {selected.resource_name ?? selected.resource_id}
              </div>
            </div>
            <pre className="max-h-[360px] overflow-auto rounded-lg bg-black/20 p-3 text-[10px] leading-relaxed text-slate-400">
              {JSON.stringify(selected.configuration, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="py-12 text-center text-[12px] text-slate-600">
            Select a resource to inspect its configuration.
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number | string;
  accent?: "slate" | "green" | "red";
}) {
  const color =
    accent === "green"
      ? "text-emerald-400"
      : accent === "red"
        ? "text-red-400"
        : "text-slate-300";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-600">
        {label}
      </div>
      <div className={`mt-1 font-mono text-[18px] ${color}`}>{value}</div>
    </div>
  );
}

function getScore(scan: DashboardScan) {
  const evaluable = scan.total_passed + scan.total_failed;
  if (evaluable === 0) return 0;
  return Math.round((scan.total_passed / evaluable) * 100);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-slate-600 uppercase tracking-wider text-[10px] mb-1">
        {label}
      </div>
      <div className="text-slate-400 font-mono">{value ?? "—"}</div>
    </div>
  );
}
