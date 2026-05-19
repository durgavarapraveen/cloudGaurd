"use client";

import { useState } from "react";
import { Cloud, ChevronDown, Eye, EyeOff, ShieldCheck } from "lucide-react";

type ProviderType = "aws" | "azure" | "gcp" | "oci";

export default function Page() {
  const [provider, setProvider] = useState<ProviderType>("aws");

  const [showSecret, setShowSecret] = useState(false);

  return (
    <div className="min-h-screen bg-[#020617] text-white px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3">
              <Cloud className="h-6 w-6 text-emerald-400" />
            </div>

            <div>
              <h1 className="text-3xl font-bold">Link Cloud Account</h1>

              <p className="mt-1 text-sm text-slate-400">
                Connect AWS, Azure, GCP, or OCI securely
              </p>
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
          {/* CLOUD PROVIDER */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Cloud Provider
            </label>

            <div className="relative">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderType)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none transition focus:border-emerald-500/40"
              >
                <option value="aws">AWS</option>
                <option value="azure">Azure</option>
                <option value="gcp">Google Cloud Platform</option>
                <option value="oci">Oracle Cloud OCI</option>
              </select>

              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* ACCOUNT NAME */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Account Name
            </label>

            <input
              placeholder="Production AWS"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-emerald-500/40"
            />
          </div>

          {/* ACCOUNT ID */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Account ID / Subscription ID / Project ID
            </label>

            <input
              placeholder="Enter account identifier"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-emerald-500/40"
            />
          </div>

          {/* AWS */}
          {provider === "aws" && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Access Key ID
                </label>

                <input
                  placeholder="AKIA..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none transition focus:border-emerald-500/40"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Secret Access Key
                </label>

                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    placeholder="Enter secret key"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 outline-none transition focus:border-emerald-500/40"
                  />

                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Region
                </label>

                <select className="w-full rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-3 outline-none transition focus:border-emerald-500/40">
                  <option>ap-south-1</option>
                  <option>us-east-1</option>
                  <option>eu-west-1</option>
                </select>
              </div>
            </div>
          )}

          {/* AZURE */}
          {provider === "azure" && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Tenant ID
                </label>

                <input
                  placeholder="Enter tenant ID"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Client ID
                </label>

                <input
                  placeholder="Enter client ID"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Client Secret
                </label>

                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    placeholder="Enter client secret"
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GCP */}
          {provider === "gcp" && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Project ID
                </label>

                <input
                  placeholder="Enter project ID"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Service Account JSON
                </label>

                <textarea
                  rows={6}
                  placeholder="Paste service account JSON"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
                />
              </div>
            </div>
          )}

          {/* OCI */}
          {provider === "oci" && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Tenancy OCID
                </label>

                <input
                  placeholder="Enter tenancy OCID"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  User OCID
                </label>

                <input
                  placeholder="Enter user OCID"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  API Private Key
                </label>

                <textarea
                  rows={5}
                  placeholder="Paste OCI private key"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
                />
              </div>
            </div>
          )}

          {/* SECURITY NOTE */}
          <div className="mt-8 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />

              <div>
                <h3 className="font-medium text-emerald-300">
                  Secure Credential Storage
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Credentials are encrypted before storage and only used for
                  scanning cloud resources.
                </p>
              </div>
            </div>
          </div>

          {/* BUTTON */}
          <button className="mt-8 w-full rounded-2xl bg-emerald-500 py-3 font-medium transition hover:bg-emerald-600">
            Connect Cloud Account
          </button>
        </div>
      </div>
    </div>
  );
}
