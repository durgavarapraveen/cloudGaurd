"use client";

import { useEffect, useState } from "react";
import { shallow_detector } from "@/lib/api";
import PathName from "@/components/PathName";

interface ShadowFinding {
  resource_id: string;
  resource_name: string;
  resource_type: string;
  cloud_resource_id: string;
  arn: string;
  region: string;
  score: number;
  severity: string;
  tags_present: number;
  reason: string;
  signals: {
    no_iac: boolean;
    no_owner: boolean;
    no_relationships: boolean;
    no_tags: boolean;
  };
}

export interface ShadowResponse {
  summary: {
    total_scanned: number;
    shadow_it_found: number;

    by_severity: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };

    by_resource_type: Record<string, number>;

    signals: {
      no_iac: number;
      no_owner: number;
      no_relationships: number;
      no_tags: number;
    };
  };

  findings: ShadowFinding[];
}

export default function ShadowITPage() {
  const accountIdentifier = PathName();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ShadowResponse | null>(null);

  async function runDetection() {
    setLoading(true);

    try {
      const result =
        await shallow_detector.getshallowdetectordetails(accountIdentifier);

      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runDetection();
  }, []);

  const s = data?.summary;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Shadow IT Detection
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Discover unmanaged and potentially risky resources
          </p>
        </div>

        <button
          onClick={runDetection}
          disabled={loading}
          className="
          px-5 py-2.5
          rounded-lg
          border
          border-emerald-500/30
          bg-emerald-500/10
          text-emerald-400
          hover:bg-emerald-500/20
          transition-all
        "
        >
          {loading ? "Running..." : "Detect Again"}
        </button>
      </div>

      {/* Metrics */}

      {s && (
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Resources Scanned" value={s.total_scanned} />

          <MetricCard
            title="Shadow IT Found"
            value={s.shadow_it_found}
            danger
          />

          <MetricCard title="Critical" value={s.by_severity.CRITICAL} danger />

          <MetricCard title="High" value={s.by_severity.HIGH} warning />
        </div>
      )}

      {/* Overview */}

      {s && (
        <div className="grid grid-cols-3 gap-4">
          {/* Severity */}

          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm text-slate-400 mb-4">Severity Breakdown</h3>

            <div className="space-y-3">
              <SeverityRow
                label="Critical"
                value={s.by_severity.CRITICAL}
                color="bg-red-500"
              />

              <SeverityRow
                label="High"
                value={s.by_severity.HIGH}
                color="bg-orange-500"
              />

              <SeverityRow
                label="Medium"
                value={s.by_severity.MEDIUM}
                color="bg-yellow-500"
              />

              <SeverityRow
                label="Low"
                value={s.by_severity.LOW}
                color="bg-green-500"
              />
            </div>
          </div>

          {/* Signals */}

          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm text-slate-400 mb-4">Shadow Signals</h3>

            <div className="space-y-3">
              <SignalRow label="No IaC" value={s.signals.no_iac} />

              <SignalRow label="No Owner" value={s.signals.no_owner} />

              <SignalRow
                label="No Relationships"
                value={s.signals.no_relationships}
              />

              <SignalRow label="No Tags" value={s.signals.no_tags} />
            </div>
          </div>

          {/* Resource Types */}

          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm text-slate-400 mb-4">Resource Types</h3>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {Object.entries(s.by_resource_type)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-slate-400">{type}</span>

                    <span className="text-white font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Findings */}

      {data && (
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="p-5 border-b border-white/[0.06]">
            <h2 className="text-white font-medium">Shadow IT Findings</h2>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-500">
                  <th className="p-4 text-left">Resource</th>

                  <th className="p-4 text-left">Type</th>

                  <th className="p-4 text-left">Region</th>

                  <th className="p-4 text-left">Score</th>

                  <th className="p-4 text-left">Severity</th>

                  <th className="p-4 text-left">Reason</th>
                </tr>
              </thead>

              <tbody>
                {data.findings.map((f) => (
                  <tr
                    key={f.resource_id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                  >
                    <td className="p-4">
                      <div className="text-white">{f.resource_name}</div>

                      <div className="text-xs text-slate-500">
                        {f.cloud_resource_id}
                      </div>
                    </td>

                    <td className="p-4 text-slate-400">{f.resource_type}</td>

                    <td className="p-4 text-slate-400">{f.region}</td>

                    <td className="p-4">
                      <span className="font-semibold text-white">
                        {f.score}
                      </span>
                    </td>

                    <td className="p-4">
                      <SeverityBadge severity={f.severity} />
                    </td>

                    <td className="p-4 text-slate-400 max-w-lg">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, danger, warning }: any) {
  return (
    <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
      <div className="text-xs text-slate-500 uppercase">{title}</div>

      <div
        className={`text-3xl font-bold mt-2 ${
          danger ? "text-red-400" : warning ? "text-orange-400" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    LOW: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  return (
    <span
      className={`px-2 py-1 rounded-md border text-xs ${
        styles[severity as keyof typeof styles]
      }`}
    >
      {severity}
    </span>
  );
}

function SeverityRow({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-slate-400">{label}</span>
      </div>

      <span className="text-white">{value}</span>
    </div>
  );
}

function SignalRow({ label, value }: any) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>

      <span className="text-white">{value}</span>
    </div>
  );
}
