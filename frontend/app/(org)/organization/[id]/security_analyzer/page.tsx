"use client";

import { useEffect, useState } from "react";
import PathName from "@/components/PathName";
import { security_analyzer } from "@/lib/api";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigSnapshot {
  public_ip: string | null;
  public_dns: string | null;
  scheme: string | null;
}

interface PublicFinding {
  id: string;
  check: "PUBLIC_RESOURCE";
  resource_type: string;
  resource_id: string;
  resource_name: string;
  region: string;
  service: string;
  severity: string;
  detail: string;
  config_snapshot: ConfigSnapshot;
}

interface PortFinding {
  id: string;
  check: "EXPOSED_PORT";
  resource_type: string;
  resource_id: string;
  resource_name: string;
  region: string;
  service: string;
  severity: string;
  port: number;
  protocol: string;
  service_name: string;
  open_cidrs: string[];
  detail: string;
  remediation: string;
}

interface EncryptionFinding {
  check: "UNENCRYPTED_RESOURCE";
  resource_type: string;
  resource_id: string;
  resource_name: string;
  region: string;
  service: string;
  severity: string;
  detail: string;
  kms_key_id: string | null;
  remediation: string;
}

type AnyFinding = PublicFinding | PortFinding | EncryptionFinding;

export interface AnalysisReport {
  summary: {
    total_resources_scanned: number;
    total_findings: number;
    severity_breakdown: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
    };
    by_check: {
      public_resources: number;
      exposed_ports: number;
      unencrypted_resources: number;
    };
  };
  type_breakdown: Record<string, number>;
  public_findings: PublicFinding[];
  port_findings: PortFinding[];
  encryption_findings: EncryptionFinding[];
  all_findings: AnyFinding[];
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-400 border border-red-500/25",
  HIGH: "bg-orange-500/15 text-orange-400 border border-orange-500/25",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
  LOW: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
};

const SEVERITY_BAR: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-emerald-500",
};

const SEVERITY_TEXT: Record<string, string> = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-yellow-400",
  LOW: "text-emerald-400",
};

// ─── Check type config ────────────────────────────────────────────────────────

const CHECK_CONFIG = {
  PUBLIC_RESOURCE: {
    label: "Public Resources",
    icon: "🌐",
    color: "text-sky-400",
    border: "border-sky-500/20",
    bg: "bg-sky-500/10",
  },
  EXPOSED_PORT: {
    label: "Exposed Ports",
    icon: "🔓",
    color: "text-red-400",
    border: "border-red-500/20",
    bg: "bg-red-500/10",
  },
  UNENCRYPTED_RESOURCE: {
    label: "Unencrypted Resources",
    icon: "🔑",
    color: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/10",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${SEVERITY_STYLES[severity] ?? "bg-slate-500/20 text-slate-400"}`}
    >
      {severity}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  valueClass = "text-white",
}: {
  label: string;
  value: number | string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-widest">
        {label}
      </span>
      <span className={`text-3xl font-bold ${valueClass}`}>{value}</span>
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  count,
  colorClass,
  bgClass,
  borderClass,
}: {
  icon: string;
  label: string;
  count: number;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl ${bgClass} border ${borderClass}`}
    >
      <span className="text-xl">{icon}</span>
      <span className={`font-semibold ${colorClass}`}>{label}</span>
      <span className={`ml-auto text-sm font-mono font-bold ${colorClass}`}>
        {count} finding{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function RemediationBox({ text }: { text: string }) {
  return (
    <div className="mt-2 p-3 bg-[#0a0a10] border border-white/[0.04] rounded-lg text-xs text-slate-400 font-mono leading-relaxed">
      <span className="text-slate-600 mr-2">→ FIX:</span>
      {text}
    </div>
  );
}

function ResourceTag({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded bg-white/[0.04] text-slate-500 text-xs font-mono border border-white/[0.04]">
      {label}
    </span>
  );
}

// ─── Finding rows ─────────────────────────────────────────────────────────────

function PublicFindingRow({
  f,
  accountIdentifier,
}: {
  f: PublicFinding;
  accountIdentifier: string;
}) {
  console.log(f)
  return (
    <div className="border border-white/[0.05] rounded-xl p-4 bg-[#0d0d14] space-y-2 hover:border-sky-500/20 transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <div className="text-white font-medium">{f.resource_name}</div>
          <div className="text-xs text-slate-500 font-mono">
            <Link
              href={`/organization/${accountIdentifier}/impact_explorer?rowId=${f.id}`}
            >
              {f.resource_id}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ResourceTag label={f.resource_type} />
          <ResourceTag label={f.region} />
          <SeverityBadge severity={f.severity} />
        </div>
      </div>
      {(f.config_snapshot.public_ip || f.config_snapshot.public_dns) && (
        <div className="flex flex-wrap gap-3 text-xs">
          {f.config_snapshot.public_ip && (
            <span className="text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
              IP: {f.config_snapshot.public_ip}
            </span>
          )}
          {f.config_snapshot.public_dns && (
            <span className="text-slate-400 font-mono truncate max-w-xs">
              {f.config_snapshot.public_dns}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PortFindingRow({
  f,
  accountIdentifier,
}: {
  f: PortFinding;
  accountIdentifier: string;
}) {
  return (
    <div className="border border-white/[0.05] rounded-xl p-4 bg-[#0d0d14] space-y-2 hover:border-red-500/20 transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <div className="text-white font-medium">{f.resource_name}</div>
          <div className="text-xs text-slate-500 font-mono">
            <Link
              href={`/organization/${accountIdentifier}/impact_explorer?rowId=${f.id}`}
            >
              {f.resource_id}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ResourceTag label={f.region} />
          <SeverityBadge severity={f.severity} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 font-mono font-bold text-sm">
          :{f.port}
        </span>
        <span className="text-slate-400">{f.service_name}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-500 uppercase">{f.protocol}</span>
        <span className="text-slate-600">·</span>
        {f.open_cidrs.map((cidr) => (
          <span
            key={cidr}
            className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-mono border border-red-500/20"
          >
            {cidr}
          </span>
        ))}
      </div>
      <RemediationBox text={f.remediation} />
    </div>
  );
}

function EncryptionFindingRow({ f }: { f: EncryptionFinding }) {
  return (
    <div className="border border-white/[0.05] rounded-xl p-4 bg-[#0d0d14] space-y-2 hover:border-amber-500/20 transition-colors">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <div className="text-white font-medium">{f.resource_name}</div>
          <div className="text-xs text-slate-500 font-mono">
            {f.resource_id}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ResourceTag label={f.resource_type} />
          <ResourceTag label={f.region} />
          <SeverityBadge severity={f.severity} />
        </div>
      </div>
      <div className="text-xs text-slate-400">{f.detail}</div>
      {!f.kms_key_id && (
        <span className="text-xs text-amber-600 font-mono">
          No KMS key assigned
        </span>
      )}
      <RemediationBox text={f.remediation} />
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = ["overview", "public", "ports", "encryption", "all"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: "Overview",
  public: "Public Resources",
  ports: "Exposed Ports",
  encryption: "Encryption",
  all: "All Findings",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SecurityAnalysisPage() {
  const accountIdentifier = PathName();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  async function runAnalysis() {
    setLoading(true);
    try {
      const json =
        await security_analyzer.get_security_report(accountIdentifier);
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runAnalysis();
  }, []);

  const s = data?.summary;

  // ── severity filter applied to all_findings ──────────────────
  const filteredFindings = (data?.all_findings ?? []).filter(
    (f) => severityFilter === "ALL" || f.severity === severityFilter,
  );

  // ── risk score (0–100) for the gauge ──────────────────────────
  const riskScore = s
    ? Math.min(
        100,
        Math.round(
          ((s.severity_breakdown.CRITICAL * 10 +
            s.severity_breakdown.HIGH * 4 +
            s.severity_breakdown.MEDIUM * 2 +
            s.severity_breakdown.LOW * 1) /
            Math.max(s.total_resources_scanned, 1)) *
            10,
        ),
      )
    : 0;

  const riskLabel =
    riskScore >= 70
      ? "Critical Risk"
      : riskScore >= 40
        ? "High Risk"
        : riskScore >= 20
          ? "Medium Risk"
          : "Low Risk";

  const riskColor =
    riskScore >= 70
      ? "text-red-400"
      : riskScore >= 40
        ? "text-orange-400"
        : riskScore >= 20
          ? "text-yellow-400"
          : "text-emerald-400";

  return (
    <div className="p-8 space-y-6 min-h-screen bg-[#08080f]">
      {/* ── Header ── */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Security Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Public exposure · Port risks · Encryption gaps
          </p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-sm disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Re-run Scan"}
        </button>
      </div>

      {/* ── Loading state ── */}
      {loading && !data && (
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm gap-3">
          <span className="animate-spin text-lg">⟳</span>
          Running security analysis…
        </div>
      )}

      {data && s && (
        <>
          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Resources Scanned"
              value={s.total_resources_scanned}
              sub="across all services"
            />
            <MetricCard
              label="Total Findings"
              value={s.total_findings}
              valueClass={
                s.total_findings > 0 ? "text-orange-400" : "text-emerald-400"
              }
              sub={s.total_findings === 0 ? "Clean ✓" : "require attention"}
            />
            <MetricCard
              label="Critical"
              value={s.severity_breakdown.CRITICAL}
              valueClass="text-red-400"
              sub="immediate action needed"
            />
            <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-1">
              <span className="text-xs text-slate-500 uppercase tracking-widest">
                Risk Score
              </span>
              <span className={`text-3xl font-bold ${riskColor}`}>
                {riskScore}
              </span>
              <span className={`text-xs font-medium ${riskColor}`}>
                {riskLabel}
              </span>
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 border-b border-white/[0.06] pb-0">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm rounded-t-lg transition-all relative ${
                  activeTab === tab
                    ? "text-white bg-white/[0.04] border border-b-0 border-white/[0.08]"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {TAB_LABELS[tab]}
                {tab !== "overview" && tab !== "all" && (
                  <span
                    className={`ml-2 text-xs font-mono font-bold ${
                      tab === "public"
                        ? "text-sky-500"
                        : tab === "ports"
                          ? "text-red-500"
                          : "text-amber-500"
                    }`}
                  >
                    {tab === "public"
                      ? s.by_check.public_resources
                      : tab === "ports"
                        ? s.by_check.exposed_ports
                        : s.by_check.unencrypted_resources}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* 3-col breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Severity breakdown */}
                <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm text-slate-400 font-medium">
                    Severity Breakdown
                  </h3>
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(
                    (sev) => {
                      const count = s.severity_breakdown[sev];
                      const pct = s.total_findings
                        ? Math.round((count / s.total_findings) * 100)
                        : 0;
                      return (
                        <div key={sev} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className={SEVERITY_TEXT[sev]}>{sev}</span>
                            <span className="text-slate-400">{count}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${SEVERITY_BAR[sev]}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* By check type */}
                <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 space-y-4">
                  <h3 className="text-sm text-slate-400 font-medium">
                    By Check Type
                  </h3>
                  {(
                    [
                      {
                        key: "public_resources",
                        label: "Public Resources",
                        icon: "🌐",
                        color: "text-sky-400",
                        count: s.by_check.public_resources,
                      },
                      {
                        key: "exposed_ports",
                        label: "Exposed Ports",
                        icon: "🔓",
                        color: "text-red-400",
                        count: s.by_check.exposed_ports,
                      },
                      {
                        key: "unencrypted_resources",
                        label: "Unencrypted Resources",
                        icon: "🔑",
                        color: "text-amber-400",
                        count: s.by_check.unencrypted_resources,
                      },
                    ] as const
                  ).map(({ key, label, icon, color, count }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span>{icon}</span>
                        <span className="text-sm text-slate-400">{label}</span>
                      </div>
                      <span className={`font-bold text-sm ${color}`}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Resource types */}
                <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 space-y-3">
                  <h3 className="text-sm text-slate-400 font-medium">
                    Affected Resource Types
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {Object.entries(data.type_breakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <div
                          key={type}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-500 font-mono text-xs">
                            {type}
                          </span>
                          <span className="text-white font-semibold">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Quick summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickCard
                  icon="🌐"
                  title="Public Exposure"
                  count={s.by_check.public_resources}
                  items={data.public_findings.map((f) => f.resource_name)}
                  colorClass="text-sky-400"
                  borderClass="border-sky-500/15"
                  onClick={() => setActiveTab("public")}
                />
                <QuickCard
                  icon="🔓"
                  title="Exposed Ports"
                  count={s.by_check.exposed_ports}
                  items={data.port_findings.map(
                    (f) =>
                      `Port ${f.port} (${f.service_name}) on ${f.resource_name}`,
                  )}
                  colorClass="text-red-400"
                  borderClass="border-red-500/15"
                  onClick={() => setActiveTab("ports")}
                />
                <QuickCard
                  icon="🔑"
                  title="Unencrypted"
                  count={s.by_check.unencrypted_resources}
                  items={data.encryption_findings.map((f) => f.resource_name)}
                  colorClass="text-amber-400"
                  borderClass="border-amber-500/15"
                  onClick={() => setActiveTab("encryption")}
                />
              </div>
            </div>
          )}

          {/* ── Tab: Public Resources ── */}
          {activeTab === "public" && (
            <div className="space-y-3">
              <SectionHeader
                icon="🌐"
                label="Publicly Accessible Resources"
                count={data.public_findings.length}
                colorClass="text-sky-400"
                bgClass="bg-sky-500/5"
                borderClass="border-sky-500/20"
              />
              {data.public_findings.length === 0 ? (
                <EmptyState label="No publicly exposed resources found" />
              ) : (
                data.public_findings.map((f) => (
                  <PublicFindingRow
                    key={f.resource_id}
                    f={f}
                    accountIdentifier={accountIdentifier}
                  />
                ))
              )}
            </div>
          )}

          {/* ── Tab: Exposed Ports ── */}
          {activeTab === "ports" && (
            <div className="space-y-3">
              <SectionHeader
                icon="🔓"
                label="Ports Exposed to 0.0.0.0/0"
                count={data.port_findings.length}
                colorClass="text-red-400"
                bgClass="bg-red-500/5"
                borderClass="border-red-500/20"
              />
              {data.port_findings.length === 0 ? (
                <EmptyState label="No exposed ports found" />
              ) : (
                data.port_findings.map((f, i) => (
                  <PortFindingRow
                    key={`${f.resource_id}-${f.port}-${i}`}
                    f={f}
                    accountIdentifier={accountIdentifier}
                  />
                ))
              )}
            </div>
          )}

          {/* ── Tab: Encryption ── */}
          {activeTab === "encryption" && (
            <div className="space-y-3">
              <SectionHeader
                icon="🔑"
                label="Unencrypted Resources"
                count={data.encryption_findings.length}
                colorClass="text-amber-400"
                bgClass="bg-amber-500/5"
                borderClass="border-amber-500/20"
              />
              {data.encryption_findings.length === 0 ? (
                <EmptyState label="All resources are encrypted" />
              ) : (
                data.encryption_findings.map((f) => (
                  <EncryptionFindingRow key={f.resource_id} f={f} />
                ))
              )}
            </div>
          )}

          {/* ── Tab: All Findings ── */}
          {activeTab === "all" && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500">
                  Filter by severity:
                </span>
                {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      severityFilter === sev
                        ? sev === "ALL"
                          ? "bg-white/10 text-white border-white/20"
                          : `${SEVERITY_STYLES[sev]}`
                        : "bg-transparent text-slate-500 border-white/[0.06] hover:border-white/10"
                    }`}
                  >
                    {sev}
                    {sev !== "ALL" && (
                      <span className="ml-1.5 opacity-70">
                        {
                          s.severity_breakdown[
                            sev as keyof typeof s.severity_breakdown
                          ]
                        }
                      </span>
                    )}
                  </button>
                ))}
                <span className="ml-auto text-xs text-slate-600">
                  {filteredFindings.length} finding
                  {filteredFindings.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Unified table */}
              <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-4 text-left">Resource</th>
                      <th className="p-4 text-left">Check</th>
                      <th className="p-4 text-left">Type</th>
                      <th className="p-4 text-left">Region</th>
                      <th className="p-4 text-left">Severity</th>
                      <th className="p-4 text-left">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.map((f, i) => {
                      const cfg =
                        CHECK_CONFIG[f.check as keyof typeof CHECK_CONFIG];
                      return (
                        <tr
                          key={`${f.resource_id}-${i}`}
                          className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="p-4">
                            <div className="text-white font-medium">
                              {f.resource_name}
                            </div>
                            <div className="text-xs text-slate-600 font-mono">
                              {f.resource_id}
                            </div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`text-xs font-mono ${cfg?.color ?? "text-slate-400"}`}
                            >
                              {cfg?.icon} {f.check}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-slate-500 font-mono bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">
                              {f.resource_type}
                            </span>
                          </td>
                          <td className="p-4 text-slate-400 text-xs font-mono">
                            {f.region}
                          </td>
                          <td className="p-4">
                            <SeverityBadge severity={f.severity} />
                          </td>
                          <td className="p-4 text-slate-400 text-xs max-w-xs">
                            {f.detail}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredFindings.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-slate-600 text-sm"
                        >
                          No findings match this filter
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── QuickCard ────────────────────────────────────────────────────────────────

function QuickCard({
  icon,
  title,
  count,
  items,
  colorClass,
  borderClass,
  onClick,
}: {
  icon: string;
  title: string;
  count: number;
  items: string[];
  colorClass: string;
  borderClass: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-[#0d0d14] border ${borderClass} rounded-xl p-5 space-y-3 hover:bg-white/[0.02] transition-all`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm text-slate-400 font-medium">{title}</span>
        </div>
        <span className={`text-2xl font-bold ${colorClass}`}>{count}</span>
      </div>
      <div className="space-y-1">
        {items.slice(0, 3).map((item, i) => (
          <div key={i} className="text-xs text-slate-600 font-mono truncate">
            · {item}
          </div>
        ))}
        {items.length > 3 && (
          <div className={`text-xs ${colorClass} opacity-60`}>
            +{items.length - 3} more →
          </div>
        )}
      </div>
    </button>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-12 text-center text-slate-600 text-sm border border-white/[0.04] rounded-xl bg-[#0d0d14]">
      ✓ {label}
    </div>
  );
}
