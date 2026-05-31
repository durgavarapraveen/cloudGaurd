"use client";

import { useEffect, useMemo, useState } from "react";
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
import PathName from "@/components/PathName";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ResourceSummaryResponse } from "@/lib/props";
import ResourcesDBPage from "./resources/page";
import ResourceSummary from "./[summary_id]/page";
import toast, { Toaster } from "react-hot-toast";

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
      "sg",
      "Subnet",
      "cloud_formation",
      "lambda",
      "elb_alb_nlb",
      "vpc",
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
  cloud_formation: "Cloud Formation",
  sg: "security Group",
  vpc: "virtual Private Cloud",
  elb_alb_nlb: "ELB ALB NLB",
  lambda: "Lambda",
  subnet: "Subnet",
};

export default function ResourcesPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const resourceChildPath = pathname.split("/resource_summary/")[1];
  const childView =
    searchParams.get("view") ??
    (resourceChildPath === "resources" ? "resources" : null);
  const summaryId =
    searchParams.get("summary_id") ??
    (resourceChildPath && resourceChildPath !== "resources"
      ? resourceChildPath
      : null);

  if (childView === "resources") {
    return <ResourcesDBPage />;
  }

  if (summaryId) {
    return <ResourceSummary summaryId={summaryId} />;
  }

  return <ResourceSummaryList />;
}

function ResourceSummaryList() {
  const path = PathName();
  const router = useRouter();

  const [data, setData] = useState<ResourceSummaryResponse[] | []>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const result = await awsScannerApi.scan({
        account_identifier: path,
      });
      if (result.success) {
        toast.success(result.message);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to fetch resources"));
    } finally {
      setLoading(false);
    }
  }

  const fetch = async () => {
    const res = await awsScannerApi.fetch_resources_summary({
      account_identifier: path,
    });
    setData(res);
  };
  useEffect(() => {
    fetch();
  }, []);

  // const resources: CloudResource[] = data?.resources?.[service] ?? [];

  return (
    <div className="p-8 space-y-6 relative z-10">
      <Toaster />
      <div className="fade-up flex items-start justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Resource Fetch Summary
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Raw cloud resource configurations fetched from your connected
            backend
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              router.push(`/organization/${path}/resource_summary/resources`)
            }
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all border ${
              loading
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-500/50 cursor-not-allowed"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            Resources
          </button>

          <button
            onClick={load}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium transition-all border ${
              loading
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

      {error && (
        <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-4 text-[13px] text-red-400">
          {error}
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
        <div className="fade-up">
          <div className="border border-white/[0.06] rounded-2xl overflow-hidden bg-[#0f1117]">
            {/* HEADER */}
            <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Total summaries: {data.length}
                </p>
              </div>
            </div>

            {data.length === 0 ? (
              <div className="py-14 text-center text-[13px] text-slate-500">
                No resources found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06]">
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-4 font-medium">Summary ID</th>

                      <th className="px-5 py-4 font-medium">Total Resources</th>

                      <th className="px-5 py-4 font-medium">New Resources</th>

                      <th className="px-5 py-4 font-medium">
                        Updated Resources
                      </th>

                      <th className="px-5 py-4 font-medium">
                        Deleted Resources
                      </th>

                      <th className="px-5 py-4 font-medium">Fetched Date</th>

                      <th className="px-5 py-4 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.map((d, i) => (
                      <tr
                        key={`${d.id}-${i}`}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono text-[12px] text-emerald-400">
                            {d.id}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[13px] text-slate-300">
                          {d.total_resources_fetched_count}
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 text-[11px]">
                            {d.newly_added_resources_count}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-300 text-[11px]">
                            {d.updated_resources_count}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="px-2 py-1 rounded-lg bg-orange-500/10 text-red-300 text-[11px]">
                            {d.deleted_resources_count}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-[12px] text-slate-400">
                          {new Date(d.fetched_date).toLocaleString()}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() =>
                              router.push(
                                `/organization/${path}/resource_summary/${d.id}`,
                              )
                            }
                            className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition text-[12px]"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
