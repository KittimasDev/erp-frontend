import { apiFetch } from "./client";
import type { WarehouseSummaryApiResponse } from "@/types/warehouse-dashboard";

export function getWarehouseDashboardSummary(token: string) {
  return apiFetch<WarehouseSummaryApiResponse>(
    "/api/inventory/dashboard/summary",
    { method: "GET", token },
  );
}
