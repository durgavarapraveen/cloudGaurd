"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Cloud,
  Plus,
  Shield,
  Server,
  KeyRound,
  Trash2,
  Loader2,
} from "lucide-react";

import Link from "next/link";

import { cloudAccounts } from "@/lib/api";
import { CloudAccount } from "@/lib/props";

export default function Page() {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function fetchAccounts() {
    try {
      setLoading(true);
      const res = await cloudAccounts.getAllAccounts();

      setAccounts(res || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount(id: string) {
    try {
      setDeleting(id);
      await cloudAccounts.deleteAccount(id);
      setAccounts((prev) => prev.filter((account) => account.id !== id));
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  const providerStats = useMemo(() => {
    const stats = {
      aws: 0,
      azure: 0,
      gcp: 0,
      oci: 0,
    };

    accounts.forEach((account) => {
      const provider = account.provider?.toLowerCase();

      if (provider in stats) {
        stats[provider as keyof typeof stats]++;
      }
    });

    return [
      {
        id: "aws",
        name: "AWS",
        linked: stats.aws,
        icon: <Cloud className="h-5 w-5" />,
      },
      {
        id: "azure",
        name: "Azure",
        linked: stats.azure,
        icon: <Shield className="h-5 w-5" />,
      },
      {
        id: "gcp",
        name: "Google Cloud",
        linked: stats.gcp,
        icon: <Server className="h-5 w-5" />,
      },
      {
        id: "oci",
        name: "Oracle OCI",
        linked: stats.oci,
        icon: <KeyRound className="h-5 w-5" />,
      },
    ];
  }, [accounts]);

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Cloud Accounts
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Manage and connect your cloud provider accounts
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
          {providerStats.map((provider) => (
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

        {/* TABLE */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Connected Accounts</h2>

            <p className="mt-1 text-sm text-slate-400">
              All currently active cloud integrations
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center text-slate-400">
              No cloud accounts connected
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-left text-sm text-slate-400">
                    <th className="px-4">Provider</th>
                    <th className="px-4">Account Name</th>
                    <th className="px-4">Account Id</th>
                    <th className="px-4">Region</th>
                    <th className="px-4">Status</th>
                    <th className="px-4">Last Scan</th>
                    <th className="px-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="bg-[#0f172a]/70">
                      <td className="rounded-l-2xl px-4 py-4">
                        {account.provider}
                      </td>

                      <td className="px-4 py-4">
                        {account.account_name || "Unnamed Account"}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        <Link href={`${account.account_identifier}`}>
                          {account.account_identifier || "unnamed identifier"}
                        </Link>
                      </td>

                      <td className="px-4 py-4">{account.region || "-"}</td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                          {account.status || "Active"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-400">
                        {account.last_scan || "-"}
                      </td>

                      <td className="rounded-r-2xl px-4 py-4">
                        <button
                          onClick={() => deleteAccount(account.id)}
                          disabled={deleting === account.id}
                          className="flex items-center gap-2 rounded-xl border border-red-500/10 bg-red-500/5 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                        >
                          {deleting === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Remove
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
    </div>
  );
}
