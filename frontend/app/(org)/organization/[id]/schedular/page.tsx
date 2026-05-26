"use client";

import { useEffect, useState, use } from "react";
import { schedular } from "@/lib/api";
import { CreateSchedulerPayload, Scheduler } from "@/lib/props";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import SchedulerDetailPage from "./details/[schId]/page";
import { formatFetchTime } from "@/components/FormatTime";

async function getAllSchedulers(
  accountIdentifier: string,
): Promise<Scheduler[]> {
  const data = await schedular.getAllSchedulars(accountIdentifier);

  return Array.isArray(data) ? data : (data ?? data ?? []);
}

async function createScheduler(
  data: CreateSchedulerPayload,
  accountIdentifier: string,
): Promise<void> {
  const res = await schedular.createSchedular(data, accountIdentifier);
}

async function makeInactive(
  schedulerId: string,
  active: boolean,
): Promise<void> {
  if (active) {
    const res = await schedular.makeSchedularInactive(schedulerId);
  } else {
    const res = await schedular.makeSchedularactive(schedulerId);
  }
}

async function deleteScheduler(schedulerId: string) {
  return await schedular.deleteSchedular(schedulerId);
}

async function updateScheduler(
  schedulerId: string,
  data: CreateSchedulerPayload,
): Promise<void> {
  const res = await schedular.updateSchedular(data, schedulerId);
}

const emptyForm: CreateSchedulerPayload = {
  name: "",
  fetch_time: "00:00",
  frequency: 1,
  stop_date: "",
};

export default function SchedulerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const detailPath = pathname.match(/\/schedular\/details\/([^/]+)/);
  const schedulerId = searchParams.get("scheduler_id") ?? detailPath?.[1];

  if (schedulerId) {
    return <SchedulerDetailPage schedulerId={schedulerId} />;
  }

  return <SchedulerListPage params={params} />;
}

function SchedulerListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [schedulers, setSchedulers] = useState<Scheduler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSchedulerPayload>(emptyForm);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllSchedulers(id);
      setSchedulers(data);
      console.log(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(s: Scheduler) {
    setEditingId(s.id);

    // Convert UTC fetch_time → local for display in form
    const [hours, minutes] = s.fetch_time.split(":");
    const utcDate = new Date();
    utcDate.setUTCHours(Number(hours), Number(minutes), 0, 0);
    const localFetchTime = `${String(utcDate.getHours()).padStart(2, "0")}:${String(utcDate.getMinutes()).padStart(2, "0")}`;

    setForm({
      name: s.name,
      fetch_time: localFetchTime, // ← local time in form
      frequency: s.frequency,
      stop_date: s.stop_date?.slice(0, 16) ?? "",
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    // Convert local fetch_time → UTC
    const [hours, minutes] = form.fetch_time.split(":");
    const localDate = new Date();
    localDate.setHours(Number(hours), Number(minutes), 0, 0);
    const utcFetchTime = `${String(localDate.getUTCHours()).padStart(2, "0")}:${String(localDate.getUTCMinutes()).padStart(2, "0")}`;

    const payload = { ...form, fetch_time: utcFetchTime };

    try {
      if (editingId) {
        await updateScheduler(editingId, payload);
      } else {
        await createScheduler(payload, id);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string, active: boolean) {
    try {
      await makeInactive(id, active);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await deleteScheduler(id);
      console.log(res);
      if (res) {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate");
    }
  }

  function formatFrequency(hours: number) {
    if (hours < 24) return `Every ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Every ${days}d`;
  }

  function formatStopDate(dt: string) {
    if (!dt) return "—";
    return new Date(dt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Resource Schedulers
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Automate periodic cloud resource fetching for this account.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[13px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <line
              x1="6.5"
              y1="1"
              x2="6.5"
              y2="12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="1"
              y1="6.5"
              x2="12"
              y2="6.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          New Scheduler
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-[13px] font-medium text-white mb-5">
            {editingId ? "Edit Scheduler" : "Create Scheduler"}
          </h2>
          {formError && (
            <div className="mb-4 border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-[13px] text-red-400">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                  Name
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  maxLength={100}
                  placeholder="Daily AWS scan"
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                  Fetch Time
                </span>
                <input
                  type="time"
                  required
                  value={form.fetch_time}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, fetch_time: e.target.value }))
                  }
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                  Frequency (Hours)
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      frequency: Number(e.target.value),
                    }))
                  }
                  placeholder="24"
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
                <span className="text-[11px] text-slate-600">
                  {form.frequency >= 24
                    ? `Every ${Math.floor(form.frequency / 24)} day(s)`
                    : `Every ${form.frequency} hour(s)`}
                </span>
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] text-slate-500 uppercase tracking-widest">
                  Stop Date
                </span>
                <input
                  type="datetime-local"
                  required
                  value={form.stop_date}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, stop_date: e.target.value }))
                  }
                  className="w-full rounded-lg bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-[13px] text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </label>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[13px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting && (
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                )}
                {submitting ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 text-[13px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Name
              </th>
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Fetch Time
              </th>
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Frequency
              </th>
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Stop Date
              </th>
              <th className="text-left px-5 py-3 text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                Status
              </th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="w-5 h-5 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                  </div>
                </td>
              </tr>
            ) : schedulers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-12 text-center text-[13px] text-slate-600"
                >
                  No schedulers yet. Create one to automate resource fetching.
                </td>
              </tr>
            ) : (
              schedulers.map((s, i) => (
                <tr
                  key={s.id}
                  className={`transition-colors hover:bg-white/[0.02] ${
                    i !== schedulers.length - 1
                      ? "border-b border-white/[0.04]"
                      : ""
                  }`}
                >
                  <td className="px-5 py-3.5 text-[13px] text-slate-200 font-medium">
                    <Link
                      href={`/organization/${id}/schedular/details/${s.id}`}
                    >
                      {s.name}
                    </Link>
                  </td>

                  <td className="px-5 py-3.5 text-[13px] text-slate-400 font-mono">
                    {formatFetchTime(s.fetch_time)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                      {formatFrequency(s.frequency)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-slate-400">
                    {formatStopDate(s.stop_date)}
                  </td>
                  <td className="px-5 py-3.5">
                    {s.is_active ? (
                      <span className="flex items-center gap-1.5 text-[12px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => openEdit(s)}
                        className="text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Edit
                      </button>
                      {
                        <button
                          onClick={() => handleDeactivate(s.id, s.is_active)}
                          className="text-[12px] text-slate-500 hover:text-red-400 transition-colors"
                        >
                          {s.is_active ? "Deactivate" : "Activate"}
                        </button>
                      }
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-[12px] text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && schedulers.length > 0 && (
        <p className="text-[12px] text-slate-600 mt-3 text-right">
          {schedulers.filter((s) => s.is_active).length} active ·{" "}
          {schedulers.length} total
        </p>
      )}
    </div>
  );
}
