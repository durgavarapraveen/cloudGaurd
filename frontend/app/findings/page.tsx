"use client";

import { useCallback, useEffect, useState } from "react";
import { dashboardApi, DashboardScan, DashboardScanDetail } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { ScanHistory } from "@/components/ScanHistory";
import { ScanDetailPanel } from "@/components/ScanDetailPanel";

export default function FindingsPage() {
  const [error, setError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [scanHistory, setScanHistory] = useState<DashboardScan[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedScan, setSelectedScan] = useState<DashboardScanDetail | null>(
    null,
  );

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

  useEffect(() => {
    loadScanHistory();
  }, [loadScanHistory]);

  return (
    <div className="p-8 space-y-6 relative z-10">
      {/* Header */}
      <div className="fade-up flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Findings
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            All compliance check results across your AWS resources
          </p>
        </div>
      </div>

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-[13px] text-red-400">
          {error}
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
    </div>
  );
}
