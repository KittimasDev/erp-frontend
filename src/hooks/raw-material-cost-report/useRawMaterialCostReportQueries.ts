"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getRawMaterialCostDetail,
  getRawMaterialCostSummary,
} from "@/lib/api/raw-material-cost-report";
import { getAccessToken } from "@/lib/auth/token";
import type { RawMaterialCostQueryParams } from "@/types/raw-material-cost-report";

export const rawMaterialCostReportQueryKey = ["raw-material-cost-report"] as const;

/** `enabled` ปิดแท็บที่ไม่ได้แสดง — ไม่ยิงคำขอที่ไม่ได้ใช้ */
export function useRawMaterialCostSummaryQuery(
  params: RawMaterialCostQueryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [...rawMaterialCostReportQueryKey, "summary", params],
    queryFn: () => getRawMaterialCostSummary(getAccessToken(), params),
    enabled,
  });
}

export function useRawMaterialCostDetailQuery(
  params: RawMaterialCostQueryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [...rawMaterialCostReportQueryKey, "detail", params],
    queryFn: () => getRawMaterialCostDetail(getAccessToken(), params),
    enabled,
  });
}
