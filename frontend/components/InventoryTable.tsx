import { CloudInventoryResource } from "@/lib/props";
import { formatDate } from "./formatDate";
import { useState } from "react";

export function InventoryTable({
  resources,
}: {
  resources: CloudInventoryResource[];
}) {
  const [selected, setSelected] = useState<CloudInventoryResource | null>(null);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-4">
      <div className="min-w-0 overflow-hidden rounded-xl border border-white/[0.06]">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-600">
            <tr>
              <th className="px-4 py-2.5 font-medium">Resource</th>
              <th className="px-4 py-2.5 font-medium">Service</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Region</th>
              <th className="px-4 py-2.5 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {resources.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-600"
                >
                  No inventory resources were saved for this scan.
                </td>
              </tr>
            )}
            {resources.map((resource) => (
              <tr
                key={resource.id}
                onClick={() => setSelected(resource)}
                className={`cursor-pointer transition-colors ${
                  selected?.id === resource.id
                    ? "bg-emerald-500/[0.06]"
                    : "hover:bg-white/[0.02]"
                }`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-mono text-[11px] text-slate-300 truncate">
                    {resource.resource_name ?? resource.resource_id}
                  </div>
                  <div className="font-mono text-[10px] text-slate-600 truncate">
                    {resource.resource_id}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-500">
                  {resource.service}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                  {resource.resource_type}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                  {resource.region ?? "-"}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                  {formatDate(resource.last_seen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
        {selected ? (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-600">
                Configuration
              </div>
              <div className="mt-1 break-all font-mono text-[11px] text-slate-300">
                {selected.resource_name ?? selected.resource_id}
              </div>
            </div>
            <pre className="max-h-[360px] overflow-auto rounded-lg bg-black/20 p-3 text-[10px] leading-relaxed text-slate-400">
              {JSON.stringify(selected.configuration, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="py-12 text-center text-[12px] text-slate-600">
            Select a resource to inspect its configuration.
          </div>
        )}
      </div>
    </div>
  );
}
