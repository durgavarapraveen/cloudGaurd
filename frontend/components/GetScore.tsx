import { DashboardScan } from "@/lib/api";

export function getScore(scan: DashboardScan) {
  const evaluable = scan.total_passed + scan.total_failed;
  if (evaluable === 0) return 0;
  return Math.round((scan.total_passed / evaluable) * 100);
}
