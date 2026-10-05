import { apiFetch } from "./client";
import type { WarehouseSummaryApiResponse } from "@/types/warehouse-dashboard";

export function getWarehouseDashboardSummary(
  token: string,
  warehouseGroup?: string,
) {
  const search = new URLSearchParams();
  if (warehouseGroup) {
    search.set("warehouseGroup", warehouseGroup);
  }
  const query = search.toString();
  return apiFetch<WarehouseSummaryApiResponse>(
    `/api/inventory/dashboard/summary${query ? `?${query}` : ""}`,
    { method: "GET", token },
  );
}
