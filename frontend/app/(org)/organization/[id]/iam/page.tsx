"use client";

import { useCallback, useEffect, useState } from "react";
import PathName from "@/components/PathName";
import { getErrorMessage } from "@/lib/errors";
import { iam } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IamFinding {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  check: string;
  detail: string;
  resource_id: string;
  resource_name: string;
}

interface ChecksSummary {
  policy_checks: number;
  access_key_checks: number;
  unused_role_checks: number;
  inline_policies: number;
  boundary_checks: number;
}

interface SeveritySummary {
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
}

export interface IamResult {
  total_findings: number;
  severity_summary: SeveritySummary;
  checks_summary: ChecksSummary;
  findings: IamFinding[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchIamAnalysis(
  cloudAccountId: string,
  organizationId: string,
): Promise<IamResult> {
  const res = await iam.getIAMdetails(cloudAccountId, organizationId);
  console.log(res);
  return res;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  CRITICAL: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    bar: "bg-red-500",
  },
  HIGH: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    bar: "bg-orange-500",
  },
  MEDIUM: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    bar: "bg-yellow-500",
  },
  LOW: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    bar: "bg-slate-500",
  },
} as const;

const CHECK_LABELS: Record<string, string> = {
  DANGEROUS_ACTION: "Dangerous Action",
  ROLE_NEVER_USED: "Unused Role",
  ADMIN_NO_PERMISSIONS_BOUNDARY: "Admin – No Boundary",
  INLINE_POLICY: "Inline Policy",
  ACCESS_KEY_NOT_ROTATED: "Key Not Rotated",
  MFA_NOT_ENABLED: "MFA Disabled",
};

function checkLabel(check: string) {
  return (
    CHECK_LABELS[check] ??
    check
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function riskScore(s: SeveritySummary) {
  const raw = s.CRITICAL * 40 + s.HIGH * 20 + s.MEDIUM * 5 + s.LOW * 1;
  const score = Math.round(100 * Math.exp(-raw / 75));
  return Math.max(0, Math.min(100, score));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: IamFinding["severity"] }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      {severity}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "red" | "orange" | "green" | "yellow";
}) {
  const accentClasses = {
    red: "text-red-400",
    orange: "text-orange-400",
    green: "text-emerald-400",
    yellow: "text-yellow-400",
  } as const;

  const accentClass =
    accentClasses[(accent as keyof typeof accentClasses) ?? "red"] ??
    "text-white";

  return (
    <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 flex flex-col gap-1">
      <div className={`text-2xl font-semibold font-mono ${accentClass}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-400">{label}</div>
      {sub && <div className="text-[10px] text-slate-600">{sub}</div>}
    </div>
  );
}

function RiskGauge({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? "#34d399" : score >= 50 ? "#facc15" : "#f87171";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="8"
        />
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 55 55)"
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
        />
        <text
          x="55"
          y="52"
          textAnchor="middle"
          fill={color}
          fontSize="20"
          fontWeight="600"
          fontFamily="monospace"
        >
          {score}
        </text>
        <text
          x="55"
          y="66"
          textAnchor="middle"
          fill="#64748b"
          fontSize="9"
          fontFamily="monospace"
        >
          RISK SCORE
        </text>
      </svg>
    </div>
  );
}

function FindingRow({ f, idx }: { f: IamFinding; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        onClick={() => setOpen((v) => !v)}
        className={`cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03] ${idx % 2 === 0 ? "" : "bg-white/[0.01]"}`}
      >
        <td className="px-4 py-3">
          <SeverityBadge severity={f.severity} />
        </td>
        <td className="px-4 py-3 text-[12px] text-slate-300 font-mono">
          {checkLabel(f.check)}
        </td>
        <td className="px-4 py-3 text-[12px] text-slate-400 max-w-xs truncate">
          {f.resource_name || <span className="text-slate-600 italic">—</span>}
        </td>
        <td className="px-4 py-3 text-[11px] text-slate-600 font-mono truncate max-w-[160px]">
          {f.resource_id || "—"}
        </td>
        <td className="px-4 py-3 text-right text-slate-600">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`inline transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M2 4L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-white/[0.04] bg-white/[0.02]">
          <td colSpan={5} className="px-6 py-3">
            <p className="text-[12px] text-slate-400 leading-relaxed">
              {f.detail}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function ChecksBreakdown({ checks }: { checks: ChecksSummary }) {
  const items = [
    { label: "Policy Checks", value: checks.policy_checks },
    { label: "Unused Role Checks", value: checks.unused_role_checks },
    { label: "Boundary Checks", value: checks.boundary_checks },
    { label: "Access Key Checks", value: checks.access_key_checks },
    { label: "Inline Policies", value: checks.inline_policies },
  ];
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-32 text-[11px] text-slate-500 text-right">
            {item.label}
          </div>
          <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500/60 rounded-full transition-all duration-700"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <div className="w-6 text-right text-[12px] font-mono text-slate-400">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function SeverityBreakdown({ summary }: { summary: SeveritySummary }) {
  const total = Object.values(summary).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-3">
      {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => {
        const cfg = SEVERITY_CONFIG[sev];
        const pct = (summary[sev] / total) * 100;
        return (
          <div key={sev} className="flex items-center gap-3">
            <div
              className={`w-16 text-right text-[11px] font-mono font-semibold ${cfg.color}`}
            >
              {sev}
            </div>
            <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-6 text-right text-[12px] font-mono text-slate-400">
              {summary[sev]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IamPage() {
  const accountIdentifier = PathName();

  const [data, setData] = useState<IamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "findings">("overview");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [checkFilter, setCheckFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Derive org + account from PathName (adjust to match your routing shape)
  const cloudAccountId = accountIdentifier ?? "";
  const organizationId = ""; // populate from your routing context if needed

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIamAnalysis(cloudAccountId, organizationId);
      setData(result);
      setTab("overview");
    } catch (e: unknown) {
      setError(getErrorMessage(e, "IAM analysis failed"));
    } finally {
      setLoading(false);
    }
  }, [cloudAccountId, organizationId]);

  useEffect(() => {
    if (cloudAccountId) runAnalysis();
  }, [runAnalysis]);

  // Filtered findings
  const filteredFindings = (data?.findings ?? []).filter((f) => {
    if (severityFilter !== "ALL" && f.severity !== severityFilter) return false;
    if (checkFilter !== "ALL" && f.check !== checkFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        f.resource_name.toLowerCase().includes(q) ||
        f.resource_id.toLowerCase().includes(q) ||
        f.detail.toLowerCase().includes(q) ||
        f.check.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueChecks = Array.from(
    new Set((data?.findings ?? []).map((f) => f.check)),
  );
  const score = data ? riskScore(data.severity_summary) : null;

  return (
    <div className="p-8 space-y-8 relative z-10">
      {/* Header */}
      <div className="fade-up flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            IAM Analysis
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Identity & access risk —{" "}
            <span className="font-mono text-slate-400">
              {cloudAccountId || "no account"}
            </span>
          </p>
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all border
            ${
              loading
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500/50 cursor-not-allowed"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95"
            }`}
        >
          {loading ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
              Analyzing…
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
              Run Analysis
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
      {!data && !loading && (
        <div className="fade-up flex flex-col items-center justify-center py-24 text-center space-y-4 border border-dashed border-white/[0.08] rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect
                x="4"
                y="9"
                width="14"
                height="10"
                rx="2"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <path
                d="M8 9V6a3 3 0 016 0v3"
                stroke="#334155"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="11" cy="14" r="1.5" fill="#334155" />
            </svg>
          </div>
          <div>
            <div className="text-slate-400 text-[14px]">
              No IAM analysis yet
            </div>
            <div className="text-slate-600 text-[12px] mt-1">
              Click Run Analysis to inspect roles, policies, and keys
            </div>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
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
          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl h-64 animate-pulse" />
        </div>
      )}

      {/* Results */}
      {data && !loading && (
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
                    {data.total_findings}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Score + stat cards */}
              <div className="fade-up fade-up-delay-1 grid grid-cols-5 gap-4">
                <div className="col-span-1 bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6 flex items-center justify-center">
                  <RiskGauge score={score!} />
                </div>
                <div className="col-span-4 grid grid-cols-4 gap-4">
                  <StatCard
                    label="Total Findings"
                    value={data.total_findings}
                    sub="across all checks"
                  />
                  <StatCard
                    label="Critical"
                    value={data.severity_summary.CRITICAL}
                    sub="immediate action"
                    accent="red"
                  />
                  <StatCard
                    label="High"
                    value={data.severity_summary.HIGH}
                    sub="address soon"
                    accent="orange"
                  />
                  <StatCard
                    label="Medium"
                    value={data.severity_summary.MEDIUM}
                    sub="plan remediation"
                    accent="yellow"
                  />
                </div>
              </div>

              {/* Severity + Checks breakdown */}
              <div className="fade-up fade-up-delay-2 grid grid-cols-2 gap-4">
                <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-4">
                    Findings by severity
                  </div>
                  <SeverityBreakdown summary={data.severity_summary} />
                </div>
                <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
                  <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-4">
                    Checks run
                  </div>
                  <ChecksBreakdown checks={data.checks_summary} />
                </div>
              </div>

              {/* Top issues quick-list */}
              <div className="fade-up fade-up-delay-3 bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
                <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-4">
                  Top Issues
                </div>
                <div className="space-y-2">
                  {data.findings
                    .filter(
                      (f) => f.severity === "CRITICAL" || f.severity === "HIGH",
                    )
                    .slice(0, 5)
                    .map((f, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0"
                      >
                        <SeverityBadge severity={f.severity} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] text-slate-300 font-mono">
                            {checkLabel(f.check)}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {f.detail}
                          </div>
                        </div>
                        {f.resource_name && (
                          <div className="text-[10px] font-mono text-slate-600 shrink-0">
                            {f.resource_name}
                          </div>
                        )}
                      </div>
                    ))}
                  {data.findings.filter(
                    (f) => f.severity === "CRITICAL" || f.severity === "HIGH",
                  ).length === 0 && (
                    <div className="text-[12px] text-slate-600 py-2">
                      No critical or high findings — nice work.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── FINDINGS TAB ── */}
          {tab === "findings" && (
            <div className="fade-up space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <circle
                      cx="5"
                      cy="5"
                      r="3.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M8 8L10.5 10.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40 w-52 transition-colors"
                  />
                </div>

                {/* Severity filter */}
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-slate-400 focus:outline-none focus:border-emerald-500/40 transition-colors"
                >
                  <option value="ALL">All severities</option>
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Check type filter */}
                <select
                  value={checkFilter}
                  onChange={(e) => setCheckFilter(e.target.value)}
                  className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[12px] text-slate-400 focus:outline-none focus:border-emerald-500/40 transition-colors"
                >
                  <option value="ALL">All check types</option>
                  {uniqueChecks.map((c) => (
                    <option key={c} value={c}>
                      {checkLabel(c)}
                    </option>
                  ))}
                </select>

                <div className="ml-auto text-[11px] text-slate-600 font-mono">
                  {filteredFindings.length} / {data.total_findings} findings
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Severity", "Check", "Resource", "Resource ID", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-[10px] text-slate-600 uppercase tracking-widest font-medium"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFindings.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-12 text-center text-[12px] text-slate-600"
                        >
                          No findings match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredFindings.map((f, i) => (
                        <FindingRow key={i} f={f} idx={i} />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
