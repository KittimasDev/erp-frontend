import { apiFetch } from "./client";
import type { ExecutiveSummaryApiResponse } from "@/types/executive-dashboard";

export function getExecutiveSummary(token: string) {
  return apiFetch<ExecutiveSummaryApiResponse>(
    "/api/dashboard/executive/summary",
    { method: "GET", token },
  );
}
