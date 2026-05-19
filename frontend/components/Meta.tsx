export function Meta({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-slate-600 uppercase tracking-wider text-[10px] mb-1">
        {label}
      </div>
      <div className="text-slate-400 font-mono">{value ?? "—"}</div>
    </div>
  );
}
