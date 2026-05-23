import { useState } from "react";
import { formatDate } from "./formatDate";
import { MiniStat } from "./MiniStat";
import { getScore } from "./GetScore";
import FindingsTable from "./FindingsTable";
import { InventoryTable } from "./InventoryTable";
import { DashboardScanDetail } from "@/lib/props";

export function ScanDetailPanel({
  detail,
  loading,
  onClose,
}: {
  detail: DashboardScanDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  console.log(detail);
  const [view, setView] = useState<"findings" | "inventory">("findings");
  const [service, setService] = useState<string>("ALL");
  const inventory = detail?.inventory ?? [];
  const services = Object.keys(detail?.inventory_by_service ?? {}).sort();
  const visibleInventory =
    service === "ALL"
      ? inventory
      : inventory.filter((resource) => resource.service === service);

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
