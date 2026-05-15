"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  yamlApi,
  awsServices,
  azureServices,
  googleCloudServices,
} from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

// ── Build the provider → services map from your existing api.ts exports ──
const providerOptions = [
  {
    value: "aws",
    name: "AWS",
    services: awsServices as readonly string[],
  },
  {
    value: "azure",
    name: "Azure",
    services: azureServices as readonly string[],
  },
  {
    value: "gcp",
    name: "GCP",
    services: googleCloudServices as readonly string[],
  },
];

// ── Default YAML template shown in the editor on first load ───
const YAML_TEMPLATE = `rules:
  - id: "CUSTOM-01"
    title: "Rule title here"
    severity: HIGH
    service: s3
    resource_type: s3_bucket
    description: >
      Describe what this rule checks and why it matters.
    check:
      path: some.json.path
      operator: exists
    remediation: "Steps to fix this finding."
`;

// ── Status pill ────────────────────────────────────────────────
type SaveStatus = "idle" | "saving" | "saved" | "error";

function StatusPill({
  status,
  error,
}: {
  status: SaveStatus;
  error: string | null;
}) {
  if (status === "idle") return null;
  if (status === "saving")
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
        <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-500 border-t-slate-200 animate-spin" />
        Saving…
      </span>
    );
  if (status === "saved")
    return (
      <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        Created
      </span>
    );
  if (status === "error")
    return (
      <span
        className="flex items-center gap-1.5 text-[11px] text-red-400 font-mono"
        title={error ?? ""}
      >
        <span className="w-2 h-2 rounded-full bg-red-400" />
        {error ?? "Save failed"}
      </span>
    );
  return null;
}

// ── Line numbers ───────────────────────────────────────────────
function LineNumbers({ count }: { count: number }) {
  return (
    <div
      aria-hidden
      className="select-none text-right pr-4 pt-4 pb-4 text-[13px] leading-[1.625rem] font-mono text-slate-600 border-r border-white/[0.06] min-w-[3rem]"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i + 1}>{i + 1}</div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function NewPolicyPage() {
  const router = useRouter();

  const [yaml, setYaml] = useState<string>(YAML_TEMPLATE);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Services for the currently selected provider
  const availableServices =
    providerOptions.find((p) => p.value === selectedProvider)?.services ?? [];

  const lineCount = yaml.split("\n").length;

  // ── Validation ────────────────────────────────────────────────
  const canSave =
    selectedProvider.trim() !== "" &&
    selectedService.trim() !== "" &&
    yaml.trim() !== "" &&
    saveStatus !== "saving";

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!canSave) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      await yamlApi.createPolicy(selectedProvider, selectedService, yaml);
      setSaveStatus("saved");
      // Navigate back to policies list after a short delay
      setTimeout(() => router.push("/policies"), 1200);
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Failed to create policy"));
      setSaveStatus("error");
    }
  }, [canSave, selectedProvider, selectedService, yaml, router]);

  // Ctrl+S / Cmd+S shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-5 relative z-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-slate-600 hover:text-slate-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 3L5 8L10 13"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            New Policy
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <StatusPill status={saveStatus} error={saveError} />

          <button
            onClick={() => {
              setYaml(YAML_TEMPLATE);
              setSelectedProvider("");
              setSelectedService("");
              setSaveStatus("idle");
            }}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15] transition-all"
          >
            Reset
          </button>

          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-medium border transition-all
              ${
                canSave
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-white/[0.04] bg-transparent text-slate-600 cursor-not-allowed"
              }`}
          >
            Create <span className="text-[10px] opacity-50 ml-1">⌘S</span>
          </button>
        </div>
      </div>

      {/* Provider + Service selectors */}
      <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">
            Provider <span className="text-red-400">*</span>
          </label>
          <select
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              setSelectedService("");
            }}
            className="bg-[#0d0d14] border border-white/[0.08] text-slate-300 text-[12px] rounded-lg px-3 py-2 font-mono outline-none focus:border-emerald-500/40 transition-colors min-w-[140px]"
          >
            <option value="">Select provider</option>
            {providerOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-slate-600 uppercase tracking-wider font-medium">
            Service <span className="text-red-400">*</span>
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={!selectedProvider}
            className={`bg-[#0d0d14] border border-white/[0.08] text-[12px] rounded-lg px-3 py-2 font-mono outline-none focus:border-emerald-500/40 transition-colors min-w-[160px]
              ${
                !selectedProvider
                  ? "text-slate-600 cursor-not-allowed"
                  : "text-slate-300"
              }`}
          >
            <option value="">Select service</option>
            {availableServices.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Live preview of what will be stored */}
        {selectedProvider && selectedService && (
          <div className="ml-4 flex items-center gap-2 text-[11px] font-mono">
            <span className="text-slate-600">will store as:</span>
            <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              {selectedProvider}/{selectedService}.yaml
            </span>
          </div>
        )}

        {/* Validation hint */}
        {(!selectedProvider || !selectedService) && (
          <div className="ml-4 text-[11px] text-yellow-400/60 font-mono">
            Select provider and service to enable save
          </div>
        )}
      </div>

      {/* Hint bar */}
      <div className="flex items-center gap-4 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-600 font-mono">
        <span>YAML editor</span>
        <span className="w-px h-3 bg-white/[0.08]" />
        <span>{lineCount} lines</span>
        <span className="w-px h-3 bg-white/[0.08]" />
        <span>
          Start with the <span className="text-slate-400">rules:</span> block —
          keep indentation with 2 spaces
        </span>
        <span className="w-px h-3 bg-white/[0.08]" />
        <span className="text-slate-500">Ctrl+S to save</span>
      </div>

      {/* YAML Editor */}
      <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#0a0a10]">
        {/* Editor toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
          </div>
          <span className="text-[11px] text-slate-600 font-mono">
            {selectedProvider && selectedService
              ? `${selectedProvider}/${selectedService}.yaml`
              : "new-policy.yaml"}
          </span>
          <div className="w-16" />
        </div>

        {/* Editor body — line numbers + textarea */}
        <div
          className="flex overflow-auto"
          style={{ minHeight: "520px", maxHeight: "70vh" }}
        >
          <LineNumbers count={lineCount} />

          <textarea
            value={yaml}
            onChange={(e) => {
              setYaml(e.target.value);
              if (saveStatus === "saved" || saveStatus === "error")
                setSaveStatus("idle");
            }}
            spellCheck={false}
            className="flex-1 resize-none bg-transparent text-slate-300 font-mono text-[13px] leading-[1.625rem] p-4 outline-none caret-emerald-400 w-full"
            style={{ lineHeight: "1.625rem", tabSize: 2 }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const next =
                  yaml.substring(0, start) + "  " + yaml.substring(end);
                setYaml(next);
                requestAnimationFrame(() => {
                  e.currentTarget.selectionStart = start + 2;
                  e.currentTarget.selectionEnd = start + 2;
                });
              }
            }}
          />
        </div>
      </div>

      {/* Rules preview */}
      <RulesPreview yaml={yaml} />
    </div>
  );
}

// ── Rules preview ──────────────────────────────────────────────
function RulesPreview({ yaml }: { yaml: string }) {
  const ruleCount = (yaml.match(/^\s*- id:/gm) ?? []).length;
  if (ruleCount === 0) return null;
  return (
    <div className="flex items-center gap-3 text-[12px] text-slate-600 font-mono px-1">
      <span className="text-slate-500">
        {ruleCount} rule{ruleCount !== 1 ? "s" : ""} detected in editor
      </span>
    </div>
  );
}
