"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Cloud,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Settings2,
  X,
} from "lucide-react";
import { awsScannerApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

interface CloudResource {
  resource_id?: string;
  resource_name?: string;
  region?: string;
  [key: string]: unknown;
}

interface ResourceScanResult {
  resources?: Record<string, CloudResource[]>;
  summary?: {
    total_resources: number;
    by_service?: Record<string, number>;
  };
}

const CLOUD_PROVIDERS = {
  AWS: {
    region: "ap-south-1",
    accent: "orange",
    backendReady: true,
    services: [
      "s3",
      "ec2",
      "rds",
      "iam",
      "acm",
      "ecs",
      "efs",
      "ebs",
      "ram",
      "privatelink",
      "kms",
      "ecr",
      "elasticache",
      "route53",
      "transitGateway",
    ],
  },
  Azure: {
    region: "coming soon",
    accent: "blue",
    backendReady: false,
    services: ["vm", "storage", "sql", "ad"],
  },
  GCP: {
    region: "coming soon",
    accent: "emerald",
    backendReady: false,
    services: ["compute", "storage", "sql", "iam"],
  },
} as const;

type Provider = keyof typeof CLOUD_PROVIDERS;

const providerList = Object.keys(CLOUD_PROVIDERS) as Provider[];

const serviceLabels: Record<string, string> = {
  acm: "ACM",
  ad: "Active Directory",
  compute: "Compute",
  ebs: "EBS",
  ec2: "EC2",
  ecr: "ECR",
  ecs: "ECS",
  efs: "EFS",
  elasticache: "ElastiCache",
  iam: "IAM",
  kms: "KMS",
  privatelink: "PrivateLink",
  ram: "RAM",
  rds: "RDS",
  route53: "Route 53",
  s3: "S3",
  sql: "SQL",
  storage: "Storage",
  transitGateway: "Transit Gateway",
  vm: "Virtual Machines",
};

export default function ResourcesPage() {
  const [data, setData] = useState<ResourceScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<string>("s3");
  const [selected, setSelected] = useState<CloudResource | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<Provider>("AWS");
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>([
    "AWS",
  ]);
  const [selectedServices, setSelectedServices] = useState<
    Partial<Record<Provider, string[]>>
  >({
    AWS: ["s3"],
  });

  const selectedAwsServices = selectedServices.AWS ?? [];
  const selectedServiceCount = useMemo(
    () =>
      Object.values(selectedServices).reduce(
        (total, services) => total + (services?.length ?? 0),
        0,
      ),
    [selectedServices],
  );
  const selectedScopeLabel =
    selectedAwsServices.length === CLOUD_PROVIDERS.AWS.services.length
      ? "All AWS services"
      : selectedAwsServices
          .map((svc) => serviceLabels[svc] ?? svc.toUpperCase())
          .join(", ");
  const canFetch =
    selectedProviders.includes("AWS") && selectedAwsServices.length > 0;

  async function load() {
    if (!canFetch) {
      setError("Select at least one AWS service before fetching resources.");
      return;
    }

    setLoading(true);
    setError(null);
    setSelected(null);

    try {
      const result = (await awsScannerApi.scan({
        services: selectedAwsServices,
      })) as ResourceScanResult;

      const firstReturnedService = Object.keys(result.resources ?? {})[0];
      if (firstReturnedService) {
        setService(firstReturnedService);
      } else {
        setService(selectedAwsServices[0] ?? "s3");
      }

      setData(result);
      setModalOpen(false);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to fetch resources"));
    } finally {
      setLoading(false);
    }
  }

  const handleProviderToggle = (provider: Provider) => {
    if (!CLOUD_PROVIDERS[provider].backendReady) return;

    setSelectedProviders((prev) => {
      if (prev.includes(provider)) {
        return prev.filter((item) => item !== provider);
      }

      return [...prev, provider];
    });

    setSelectedServices((prev) => {
      if (selectedProviders.includes(provider)) {
        const copy = { ...prev };
        delete copy[provider];
        return copy;
      }

      return { ...prev, [provider]: prev[provider] ?? [] };
    });
  };

  const handleServiceToggle = (provider: Provider, svc: string) => {
    if (!CLOUD_PROVIDERS[provider].backendReady) return;

    setSelectedProviders((prev) =>
      prev.includes(provider) ? prev : [...prev, provider],
    );
    setSelectedServices((prev) => {
      const current = prev[provider] ?? [];
      const next = current.includes(svc)
        ? current.filter((item) => item !== svc)
        : [...current, svc];

      return { ...prev, [provider]: next };
    });
  };

  const selectAllServices = (provider: Provider) => {
    if (!CLOUD_PROVIDERS[provider].backendReady) return;

    setSelectedProviders((prev) =>
      prev.includes(provider) ? prev : [...prev, provider],
    );
    setSelectedServices((prev) => ({
      ...prev,
      [provider]: [...CLOUD_PROVIDERS[provider].services],
    }));
  };

  const clearProviderServices = (provider: Provider) => {
    setSelectedServices((prev) => ({ ...prev, [provider]: [] }));
  };

  const resources: CloudResource[] = data?.resources?.[service] ?? [];

  async function downloadExcel() {
    if (!canFetch) {
      setError("Select at least one AWS service before downloading resources.");
      return;
    }

    try {
      const res = await awsScannerApi.downloadExcel({
        services: selectedAwsServices,
      });
      const url = window.URL.createObjectURL(new Blob([res]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `cloud_resources_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to download Excel"));
    }
  }

  return (
    <div className="p-8 space-y-6 relative z-10">
      <div className="fade-up flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Resources
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Raw cloud resource configurations fetched from your connected
            backend
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadExcel}
            disabled={!canFetch || loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all border ${
              !canFetch || loading
                ? "border-white/[0.06] bg-white/[0.02] text-slate-600 cursor-not-allowed"
                : "border-blue-500/25 bg-blue-500/10 text-blue-300 hover:bg-blue-500/15"
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
          <button
            onClick={load}
            disabled={!canFetch || loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all border ${
              !canFetch || loading
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500/50 cursor-not-allowed"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                {data ? "Refresh" : "Fetch"}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="fade-up fade-up-delay-1 grid grid-cols-[1fr_auto] gap-4 rounded-xl border border-white/[0.06] bg-[#0d0d14] p-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <Settings2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-slate-600">
                Fetch scope
              </span>
              <span className="rounded border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono uppercase text-orange-300">
                AWS
              </span>
              <span className="rounded border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono text-slate-500">
                {selectedServiceCount} services selected
              </span>
            </div>
            <div className="mt-1 truncate text-[13px] text-slate-300">
              {selectedScopeLabel || "No services selected"}
            </div>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="self-center rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] font-medium text-slate-300 transition hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          Edit scope
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="fade-up w-full max-w-4xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d14] shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-slate-600">
                  <Cloud className="h-3.5 w-3.5" />
                  Resource fetch scope
                </div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
                  Select services to scan
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md p-2 text-slate-500 transition hover:bg-white/[0.05] hover:text-slate-200"
                aria-label="Close resource selector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid min-h-[430px] grid-cols-[220px_1fr]">
              <div className="border-r border-white/[0.06] bg-black/10 p-3">
                <div className="px-2 pb-2 text-[10px] uppercase tracking-widest text-slate-600">
                  Providers
                </div>
                <div className="space-y-1">
                  {providerList.map((provider) => {
                    const config = CLOUD_PROVIDERS[provider];
                    const isActive = activeProvider === provider;
                    const isSelected = selectedProviders.includes(provider);

                    return (
                      <button
                        key={provider}
                        onClick={() => setActiveProvider(provider)}
                        className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                          isActive
                            ? "border-emerald-500/25 bg-emerald-500/10"
                            : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              config.backendReady
                                ? config.accent === "orange"
                                  ? "bg-orange-400"
                                  : "bg-emerald-400"
                                : "bg-slate-700"
                            }`}
                          />
                          <span className="text-[13px] font-medium text-slate-200">
                            {provider}
                          </span>
                          {isSelected && (
                            <Check className="ml-auto h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-600">
                          <span>{config.region}</span>
                          <span>
                            {config.backendReady ? "backend" : "soon"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-widest text-slate-500">
                      {activeProvider} services
                    </div>
                    <div className="mt-0.5 text-[12px] text-slate-600">
                      {(selectedServices[activeProvider] ?? []).length} of{" "}
                      {CLOUD_PROVIDERS[activeProvider].services.length} selected
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectAllServices(activeProvider)}
                      disabled={!CLOUD_PROVIDERS[activeProvider].backendReady}
                      className="rounded-md border border-white/[0.08] px-3 py-1.5 text-[11px] text-slate-400 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Select all
                    </button>
                    <button
                      onClick={() => clearProviderServices(activeProvider)}
                      disabled={!CLOUD_PROVIDERS[activeProvider].backendReady}
                      className="rounded-md border border-white/[0.08] px-3 py-1.5 text-[11px] text-slate-400 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-5">
                  {!CLOUD_PROVIDERS[activeProvider].backendReady && (
                    <div className="mb-4 rounded-lg border border-blue-500/15 bg-blue-500/10 px-4 py-3 text-[12px] text-blue-200/80">
                      Backend fetching for {activeProvider} is not connected
                      yet. AWS services are ready to scan now.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {CLOUD_PROVIDERS[activeProvider].services.map((svc) => {
                      const selectedForProvider =
                        selectedServices[activeProvider] ?? [];
                      const checked = selectedForProvider.includes(svc);
                      const disabled =
                        !CLOUD_PROVIDERS[activeProvider].backendReady;

                      return (
                        <button
                          key={svc}
                          onClick={() =>
                            handleServiceToggle(activeProvider, svc)
                          }
                          disabled={disabled}
                          className={`group flex min-h-20 items-start gap-3 rounded-lg border p-3 text-left transition ${
                            checked
                              ? "border-emerald-500/30 bg-emerald-500/10"
                              : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.1] hover:bg-white/[0.035]"
                          } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                              checked
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                : "border-white/[0.08] text-transparent group-hover:border-white/[0.16]"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-slate-200">
                              {serviceLabels[svc] ?? svc.toUpperCase()}
                            </span>
                            <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-slate-600">
                              {svc}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Database className="h-3.5 w-3.5" />
                    <span className="font-mono">
                      {selectedAwsServices.length} AWS services queued
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModalOpen(false)}
                      className="rounded-lg border border-white/[0.08] px-4 py-2 text-[12px] font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={load}
                      disabled={!canFetch || loading}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-[12px] font-medium transition ${
                        !canFetch || loading
                          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500/50 cursor-not-allowed"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Fetch selected
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-[13px] text-red-400">
          {error}
        </div>
      )}

      {data?.summary && (
        <div className="fade-up flex items-center gap-3 flex-wrap">
          <div className="text-[12px] text-slate-500 font-mono">
            {data.summary.total_resources} total resources
          </div>
          <div className="w-px h-3 bg-white/[0.08]" />
          {Object.entries(data.summary.by_service ?? {}).map(([svc, count]) => (
            <button
              key={svc}
              onClick={() => {
                setService(svc);
                setSelected(null);
              }}
              className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-all uppercase ${
                service === svc
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.06] text-slate-500 hover:text-slate-300"
              }`}
            >
              {svc} <span className="opacity-50">{count}</span>
            </button>
          ))}
        </div>
      )}

      {!data && !loading && (
        <div className="fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] py-24 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-slate-500">
            <Cloud className="h-5 w-5" />
          </div>
          <div className="mt-4 text-[13px] text-slate-500">
            No resource data
          </div>
          <div className="mt-1 text-[12px] text-slate-600">
            Choose a fetch scope, then collect resources from AWS
          </div>
        </div>
      )}

      {loading && (
        <div className="border border-white/[0.06] rounded-xl overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-10 border-b border-white/[0.04] bg-white/[0.01] animate-pulse"
            />
          ))}
        </div>
      )}

      {data && !loading && (
        <div className="fade-up flex gap-4">
          <div className="flex-1 min-w-0 border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
                {service.toUpperCase()} - {resources.length} resources
              </span>
            </div>

            {resources.length === 0 ? (
              <div className="py-12 text-center text-[12px] text-slate-600">
                No {service.toUpperCase()} resources found in this account
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {resources.map((resource, i) => (
                  <button
                    key={`${resource.resource_id ?? resource.resource_name ?? service}-${i}`}
                    onClick={() => setSelected(resource)}
                    className={`w-full text-left px-4 py-3 transition-colors text-[12px] ${
                      selected === resource
                        ? "bg-emerald-500/[0.06]"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 shrink-0" />
                      <div className="font-mono text-slate-300 truncate">
                        {resource.resource_name || resource.resource_id}
                      </div>
                      <div className="ml-auto text-[10px] text-slate-600 uppercase font-mono shrink-0">
                        {resource.region}
                      </div>
                    </div>
                    {resource.resource_name &&
                      resource.resource_name !== resource.resource_id && (
                        <div className="ml-4 text-[11px] text-slate-600 mt-0.5 truncate">
                          {resource.resource_name}
                        </div>
                      )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="w-96 shrink-0 bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden self-start">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono truncate">
                  {selected.resource_id}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-slate-600 hover:text-slate-300 shrink-0 ml-2"
                  aria-label="Close resource details"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[70vh]">
                <pre className="text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
