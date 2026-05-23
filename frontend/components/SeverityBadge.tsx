import { Severity } from "@/lib/props";

const config: Record<Severity, { bg: string; text: string; dot: string }> = {
  CRITICAL: {
    bg: "bg-red-500/10 border border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  HIGH: {
    bg: "bg-orange-500/10 border border-orange-500/30",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
  MEDIUM: {
    bg: "bg-yellow-500/10 border border-yellow-500/30",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
  },
  LOW: {
    bg: "bg-green-500/10 border border-green-500/30",
    text: "text-green-400",
    dot: "bg-green-400",
  },
  INFO: {
    bg: "bg-indigo-500/10 border border-indigo-500/30",
    text: "text-indigo-400",
    dot: "bg-indigo-400",
  },
};

type BadgeProps = {
  severity: Severity;
  size?: "xs" | "sm";
};

type SeverityBarProps = {
  bySeverity: Partial<Record<Severity, number>>;
};

export default function SeverityBadge(props: BadgeProps | SeverityBarProps) {
  if ("bySeverity" in props) {
    const total = Object.values(props.bySeverity).reduce(
      (sum, count) => sum + (count ?? 0),
      0,
    );

    return (
      <div className="space-y-2">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as Severity[]).map(
          (severity) => {
            const count = props.bySeverity[severity] ?? 0;
            const c = config[severity];
            return (
              <div key={severity} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                <span className="w-20 text-[11px] font-mono text-slate-500">
                  {severity}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${c.dot}`}
                    style={{
                      width: `${total > 0 ? (count / total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] font-mono text-slate-400">
                  {count}
                </span>
              </div>
            );
          },
        )}
      </div>
    );
  }

  const { severity, size = "sm" } = props;
  const c = config[severity] ?? config["INFO"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono
        ${c.bg} ${c.text}
        ${size === "xs" ? "text-[10px]" : "text-[11px]"}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {severity}
    </span>
  );
}
