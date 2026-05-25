"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2L16.5 5.5V10C16.5 13.8 13.8 17.4 10 18.5C6.2 17.4 3.5 13.8 3.5 10V5.5L10 2Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 10L9 11.5L12.5 8"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Cloud Security & Compliance",
    description:
      "Continuously monitor your infrastructure against CIS benchmarks and custom frameworks. Full visibility into your security posture, always.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect
          x="2"
          y="5"
          width="16"
          height="4"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <rect
          x="2"
          y="11"
          width="16"
          height="4"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="5" cy="7" r="0.8" fill="currentColor" />
        <circle cx="5" cy="13" r="0.8" fill="currentColor" />
      </svg>
    ),
    title: "AWS Resource Scanner",
    description:
      "Deep scan across S3, EC2, RDS, IAM, VPC and 20+ AWS services. Discover misconfigurations before attackers do with real-time resource inventory.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle
          cx="10"
          cy="10"
          r="7.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M10 2.5C10 2.5 13 6 13 10C13 14 10 17.5 10 17.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M10 2.5C10 2.5 7 6 7 10C7 14 10 17.5 10 17.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <line
          x1="2.5"
          y1="10"
          x2="17.5"
          y2="10"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    ),
    title: "Multi-Cloud Monitoring",
    description:
      "Unified visibility across AWS, GCP, and Azure from a single dashboard. One place to understand your entire cloud security state.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect
          x="3"
          y="2"
          width="14"
          height="16"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <line
          x1="6"
          y1="7"
          x2="14"
          y2="7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="6"
          y1="10"
          x2="14"
          y2="10"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <line
          x1="6"
          y1="13"
          x2="10"
          y2="13"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
    title: "Policy & Findings Management",
    description:
      "Define custom security policies, track findings by severity, and manage remediation workflows. Turn security alerts into actionable tasks.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2.5L12 7.5H17.5L13 11L14.5 16.5L10 13.5L5.5 16.5L7 11L2.5 7.5H8L10 2.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Configuration Verification",
    description:
      "Validate resource configurations against best practices. Catch encryption gaps, public access risks, and IAM misconfigurations instantly.",
  },
];

const steps = [
  {
    number: "01",
    title: "Contact us",
    description:
      "Reach out via email or the form below. Tell us about your organization and cloud environment.",
  },
  {
    number: "02",
    title: "We set you up",
    description:
      "We create your organization account, configure your workspace, and send you login credentials.",
  },
  {
    number: "03",
    title: "Connect & scan",
    description:
      "Connect your cloud accounts and run your first security scan in minutes. Get instant findings.",
  },
];

export default function HomePage() {
  const [scanLine, setScanLine] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    org: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setScanLine((prev) => (prev + 1) % 5);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen w-screen bg-[#06060f] text-white overflow-x-hidden">
      {/* Grid bg */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.04] max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5L13 4.25V8C13 11.05 10.9 13.85 8 14.75C5.1 13.85 3 11.05 3 8V4.25L8 1.5Z"
                stroke="currentColor"
                strokeWidth="1.3"
                className="text-emerald-400"
              />
              <path
                d="M6 8L7.2 9.2L10.5 5.8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-emerald-300"
              />
            </svg>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            CloudGuard
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="#how-it-works"
            className="text-[13px] text-slate-500 hover:text-white transition-colors"
          >
            How it works
          </a>
          <a
            href="#features"
            className="text-[13px] text-slate-500 hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="#contact"
            className="text-[13px] text-slate-500 hover:text-white transition-colors"
          >
            Contact
          </a>
          <Link
            href="/login"
            className="px-4 py-2 text-[13px] font-medium rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[12px] text-emerald-400 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Enterprise cloud security platform
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-white leading-tight mb-6 max-w-3xl mx-auto">
          Know your cloud security
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
            before attackers do
          </span>
        </h1>

        <p className="text-[16px] text-slate-400 max-w-xl mx-auto leading-relaxed mb-4">
          CloudGuard is an invite-only platform for organizations serious about
          cloud security. We scan, monitor, and protect your AWS infrastructure
          — continuously.
        </p>

        <p className="text-[13px] text-slate-600 mb-10">
          No self-signup. Contact us to get your organization onboarded.
        </p>

        <div className="flex items-center justify-center gap-4">
          <a
            href="#contact"
            className="flex items-center gap-2 px-6 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[14px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            Request access
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border border-white/[0.06] text-[14px] text-slate-400 hover:text-white hover:border-white/10 transition-all"
          >
            Already have an account →
          </Link>
        </div>
      </section>

      {/* Mock UI */}
      <section className="relative z-10 max-w-6xl mx-auto px-8 pb-24">
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/40" />
            <span className="ml-3 text-[12px] text-slate-600 font-mono">
              cloudguard — scan results — acme-corp
            </span>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-3">
                Live Findings
              </div>
              {[
                {
                  rule: "CIS-S3-01",
                  title: "S3 bucket encryption must be enabled",
                  sev: "HIGH",
                  status: "FAIL",
                },
                {
                  rule: "CIS-IAM-02",
                  title: "Root account MFA should be enabled",
                  sev: "CRITICAL",
                  status: "FAIL",
                },
                {
                  rule: "CIS-EC2-01",
                  title:
                    "Security groups should not allow 0.0.0.0/0 on port 22",
                  sev: "HIGH",
                  status: "FAIL",
                },
                {
                  rule: "CIS-S3-04",
                  title: "S3 bucket versioning should be enabled",
                  sev: "MEDIUM",
                  status: "PASS",
                },
                {
                  rule: "CIS-RDS-01",
                  title: "RDS instances should not be publicly accessible",
                  sev: "CRITICAL",
                  status: "PASS",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-300 ${
                    scanLine === i
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-white/[0.04] bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      f.status === "FAIL"
                        ? "text-red-400 bg-red-500/10 border-red-500/20"
                        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    }`}
                  >
                    {f.status}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {f.rule}
                  </span>
                  <span className="text-[12px] text-slate-300 flex-1 truncate">
                    {f.title}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      f.sev === "CRITICAL"
                        ? "text-red-400"
                        : f.sev === "HIGH"
                          ? "text-orange-400"
                          : "text-yellow-400"
                    }`}
                  >
                    {f.sev}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-3">
                Security Score
              </div>
              <div className="bg-[#06060f] border border-white/[0.04] rounded-xl p-4 text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-1">
                  74<span className="text-xl text-slate-500">%</span>
                </div>
                <div className="text-[12px] text-slate-500 mb-3">
                  Overall score
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full w-[74%] bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full" />
                </div>
              </div>
              {[
                {
                  label: "CRITICAL",
                  color: "text-red-400",
                  bg: "bg-red-500/10 border-red-500/20",
                  count: 2,
                },
                {
                  label: "HIGH",
                  color: "text-orange-400",
                  bg: "bg-orange-500/10 border-orange-500/20",
                  count: 7,
                },
                {
                  label: "MEDIUM",
                  color: "text-yellow-400",
                  bg: "bg-yellow-500/10 border-yellow-500/20",
                  count: 14,
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${s.bg}`}
                >
                  <span className={`text-[11px] font-medium ${s.color}`}>
                    {s.label}
                  </span>
                  <span className={`text-[13px] font-bold ${s.color}`}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="relative z-10 max-w-6xl mx-auto px-8 pb-24"
      >
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
            How to get started
          </h2>
          <p className="text-[14px] text-slate-500">
            CloudGuard is onboarded by invitation — here&apos;s how it works.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6"
            >
              {i < steps.length - 1 && (
                <div className="absolute top-10 -right-2 w-4 h-px bg-emerald-500/20 hidden lg:block" />
              )}
              <div className="text-[11px] font-mono text-emerald-500/60 mb-4">
                {step.number}
              </div>
              <h3 className="text-[15px] font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 max-w-6xl mx-auto px-8 pb-24"
      >
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
            Everything in one platform
          </h2>
          <p className="text-[14px] text-slate-500">
            Security, compliance, and visibility — all in one place.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div
              key={i}
              className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5 hover:border-emerald-500/20 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/15 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-[14px] font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="relative z-10 max-w-6xl mx-auto px-8 pb-24"
      >
        <div className="grid grid-cols-2 gap-8">
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4">
              Request access for
              <br />
              your organization
            </h2>
            <p className="text-[14px] text-slate-400 leading-relaxed mb-6">
              CloudGuard is not open for public signup. Fill out the form and
              we&apos;ll get back to you within 24 hours to set up your
              organization&apos;s account.
            </p>
            <div className="space-y-3">
              {[
                "Dedicated organization workspace",
                "Custom security policy configuration",
                "Onboarding support included",
                "Multi-user access with roles",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-[13px] text-slate-400"
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1.5 4L3 5.5L6.5 2"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-emerald-400"
                      />
                    </svg>
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5 10L8.5 13.5L15 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-emerald-400"
                    />
                  </svg>
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-2">
                  Request received
                </h3>
                <p className="text-[13px] text-slate-500">
                  We&apos;ll be in touch within 24 hours to set up your
                  organization.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-[14px] font-semibold text-white mb-5">
                  Request access
                </h3>
                <label className="block space-y-1.5">
                  <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                    Your name
                  </span>
                  <input
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="Jane Smith"
                    className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                    Work email
                  </span>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, email: e.target.value }))
                    }
                    placeholder="jane@company.com"
                    className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                    Organization name
                  </span>
                  <input
                    required
                    value={formData.org}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, org: e.target.value }))
                    }
                    placeholder="Acme Corp"
                    className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                    Message (optional)
                  </span>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, message: e.target.value }))
                    }
                    placeholder="Tell us about your cloud environment..."
                    className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50 resize-none"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-[13px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
                >
                  Send request
                </button>
                <p className="text-[11px] text-slate-600 text-center">
                  We typically respond within 24 hours.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.04] px-8 py-6 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path
                d="M5.5 1L9.5 3.25V5.5C9.5 7.9 7.7 10.1 5.5 10.75C3.3 10.1 1.5 7.9 1.5 5.5V3.25L5.5 1Z"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-emerald-400"
              />
            </svg>
          </div>
          <span className="text-[13px] text-slate-500">CloudGuard</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-[12px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            Sign in
          </Link>
          <a
            href="#contact"
            className="text-[12px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            Contact
          </a>
          <span className="text-[12px] text-slate-700">
            © {new Date().getFullYear()} CloudGuard
          </span>
        </div>
      </footer>
    </div>
  );
}
