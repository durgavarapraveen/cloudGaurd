import { DashboardScan } from "@/lib/api";

function getScore(scan: DashboardScan) {
  const evaluable = scan.total_passed + scan.total_failed;
  if (evaluable === 0) return 0;
  return Math.round((scan.total_passed / evaluable) * 100);
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function ScanHistory({
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
