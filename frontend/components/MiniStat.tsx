export function MiniStat({
  label,
  value,
  accent = "slate",
}: {
  label: string;
  value: number | string;
  accent?: "slate" | "green" | "red";
}) {
  const color =
    accent === "green"
      ? "text-emerald-400"
      : accent === "red"
        ? "text-red-400"
        : "text-slate-300";

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-600">
        {label}
      </div>
      <div className={`mt-1 font-mono text-[18px] ${color}`}>{value}</div>
    </div>
  );
}
