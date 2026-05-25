"use client";

import { useState } from "react";

import {
  Cloud,
  ChevronDown,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import { useRouter } from "next/navigation";
import { cloudAccounts } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";

type ProviderType = "aws" | "azure" | "gcp" | "oci";

export default function Page() {
  const router = useRouter();

  const [provider, setProvider] = useState<ProviderType>("aws");

  const [showSecret, setShowSecret] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    account_name: "",
    account_id: "",

    aws_access_key_id: "",
    aws_secret_access_key: "",
    aws_region: "ap-south-1",

    azure_tenant_id: "",
    azure_client_id: "",
    azure_client_secret: "",

    gcp_project_id: "",
    gcp_service_account_json: "",

    oci_tenancy_ocid: "",
    oci_user_ocid: "",
    oci_private_key: "",
  });

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function createCloudAccount() {
    try {
      setLoading(true);
      setError("");

      let credentials: Record<string, string> = {};

      if (provider === "aws") {
        credentials = {
          access_key_id: formData.aws_access_key_id,

          secret_access_key: formData.aws_secret_access_key,

          region: formData.aws_region,
        };
      }

      if (provider === "azure") {
        credentials = {
          tenant_id: formData.azure_tenant_id,

          client_id: formData.azure_client_id,

          client_secret: formData.azure_client_secret,
        };
      }

      if (provider === "gcp") {
        credentials = {
          project_id: formData.gcp_project_id,

          service_account_json: formData.gcp_service_account_json,
        };
      }

      if (provider === "oci") {
        credentials = {
          tenancy_ocid: formData.oci_tenancy_ocid,

          user_ocid: formData.oci_user_ocid,

          private_key: formData.oci_private_key,
        };
      }

      const payload = {
        provider,
        account_name: formData.account_name,
        account_identifier: formData.account_id,
        credentials,
      };

      await cloudAccounts.createPolicy(payload);

      router.push("/organization/institution");
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to connect cloud account"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] px-4 py-8 text-white">
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
          {/* PROVIDER */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Cloud Provider
            </label>

            <div className="relative">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderType)}
                className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-3 text-white outline-none"
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
              name="account_name"
              value={formData.account_name}
              onChange={handleChange}
              placeholder="Production AWS"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
            />
          </div>

          {/* ACCOUNT ID */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Account ID / Subscription ID / Project ID
            </label>

            <input
              name="account_id"
              value={formData.account_id}
              onChange={handleChange}
              placeholder="Enter account identifier"
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
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
                  name="aws_access_key_id"
                  value={formData.aws_access_key_id}
                  onChange={handleChange}
                  placeholder="AKIA..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Secret Access Key
                </label>

                <div className="relative">
                  <input
                    name="aws_secret_access_key"
                    value={formData.aws_secret_access_key}
                    onChange={handleChange}
                    type={showSecret ? "text" : "password"}
                    placeholder="Enter secret key"
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

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Region
                </label>

                <select
                  name="aws_region"
                  value={formData.aws_region}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-3 outline-none"
                >
                  <option value="ap-south-1">ap-south-1</option>

                  <option value="us-east-1">us-east-1</option>

                  <option value="eu-west-1">eu-west-1</option>
                </select>
              </div>
            </div>
          )}

          {/* AZURE */}
          {provider === "azure" && (
            <div className="space-y-6">
              <input
                name="azure_tenant_id"
                value={formData.azure_tenant_id}
                onChange={handleChange}
                placeholder="Tenant ID"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
              />

              <input
                name="azure_client_id"
                value={formData.azure_client_id}
                onChange={handleChange}
                placeholder="Client ID"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
              />

              <input
                name="azure_client_secret"
                value={formData.azure_client_secret}
                onChange={handleChange}
                type="password"
                placeholder="Client Secret"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
              />
            </div>
          )}

          {/* GCP */}
          {provider === "gcp" && (
            <div className="space-y-6">
              <input
                name="gcp_project_id"
                value={formData.gcp_project_id}
                onChange={handleChange}
                placeholder="Project ID"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
              />

              <textarea
                rows={6}
                name="gcp_service_account_json"
                value={formData.gcp_service_account_json}
                onChange={handleChange}
                placeholder="Paste service account JSON"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
              />
            </div>
          )}

          {/* OCI */}
          {provider === "oci" && (
            <div className="space-y-6">
              <input
                name="oci_tenancy_ocid"
                value={formData.oci_tenancy_ocid}
                onChange={handleChange}
                placeholder="Tenancy OCID"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
              />

              <input
                name="oci_user_ocid"
                value={formData.oci_user_ocid}
                onChange={handleChange}
                placeholder="User OCID"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
              />

              <textarea
                rows={5}
                name="oci_private_key"
                value={formData.oci_private_key}
                onChange={handleChange}
                placeholder="Paste OCI private key"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 outline-none"
              />
            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/10 bg-red-500/5 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* SECURITY */}
          <div className="mt-8 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-400" />

              <div>
                <h3 className="font-medium text-emerald-300">
                  Secure Credential Storage
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Credentials are encrypted before storage and only used for
                  cloud scanning.
                </p>
              </div>
            </div>
          </div>

          {/* BUTTON */}
          <button
            onClick={createCloudAccount}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 font-medium transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Cloud Account"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
