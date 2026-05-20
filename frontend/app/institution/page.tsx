"use client";

import {
  Cloud,
  Plus,
  Shield,
  Server,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

type CloudProvider = {
  id: string;
  name: string;
  color: string;
  linked: number;
  icon: React.ReactNode;
};

export default function page() {
  const providers: CloudProvider[] = [
    {
      id: "aws",
      name: "AWS",
      color: "emerald",
      linked: 4,
      icon: <Cloud className="h-5 w-5" />,
    },
    {
      id: "azure",
      name: "Azure",
      color: "cyan",
      linked: 2,
      icon: <Shield className="h-5 w-5" />,
    },
    {
      id: "gcp",
      name: "Google Cloud",
      color: "purple",
      linked: 3,
      icon: <Server className="h-5 w-5" />,
    },
    {
      id: "oci",
      name: "Oracle OCI",
      color: "orange",
      linked: 1,
      icon: <KeyRound className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Cloud Accounts
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage and connect your cloud provider accounts securely
            </p>
          </div>

          <Link
            href="/institution/linknewaccount"
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-medium transition hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            Link New Account
          </Link>
        </div>

        {/* STATS */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">{provider.name}</p>

                  <h2 className="mt-3 text-3xl font-bold">{provider.linked}</h2>

                  <p className="mt-1 text-xs text-slate-500">Linked Accounts</p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-3 text-emerald-400">
                  {provider.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CONNECTED ACCOUNTS */}
        <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Connected Accounts</h2>

            <p className="mt-1 text-sm text-slate-400">
              All currently active cloud integrations
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-slate-400">
                  <th className="px-4">Provider</th>
                  <th className="px-4">Account Name</th>
                  <th className="px-4">Region</th>
                  <th className="px-4">Status</th>
                  <th className="px-4">Last Scan</th>
                  <th className="px-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {[
                  {
                    provider: "AWS",
                    name: "Production AWS",
                    region: "ap-south-1",
                    status: "Active",
                    scan: "5 mins ago",
                  },
                  {
                    provider: "Azure",
                    name: "Azure Main",
                    region: "Central India",
                    status: "Active",
                    scan: "12 mins ago",
                  },
                  {
                    provider: "GCP",
                    name: "GCP Analytics",
                    region: "asia-south1",
                    status: "Pending",
                    scan: "1 hour ago",
                  },
                ].map((account, idx) => (
                  <tr key={idx} className="rounded-2xl bg-[#0f172a]/70">
                    <td className="rounded-l-2xl px-4 py-4">
                      {account.provider}
                    </td>

                    <td className="px-4 py-4">{account.name}</td>

                    <td className="px-4 py-4">{account.region}</td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                        {account.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-slate-400">{account.scan}</td>

                    <td className="rounded-r-2xl px-4 py-4">
                      <button className="rounded-xl border border-red-500/10 bg-red-500/5 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10">
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
