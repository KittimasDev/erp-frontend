"use client";

import { useQuery } from "@tanstack/react-query";

import { getRawTirePurchaseReport } from "@/lib/api/raw-tire-purchase-receipts";
import { getAccessToken } from "@/lib/auth/token";
import type { RawTirePurchaseReportQueryParams } from "@/types/raw-tire-purchase-reports";

export const rawTirePurchaseReportQueryKey = [
  "raw-tire-purchase-report",
] as const;

export function useRawTirePurchaseReportQuery(
  params?: RawTirePurchaseReportQueryParams,
  /** ปิดเมื่อหน้าอยู่โหมดรายเดือน — ไม่ต้องยิงรายการที่ไม่ได้แสดง */
  enabled = true,
) {
  return useQuery({
    queryKey: [...rawTirePurchaseReportQueryKey, params ?? {}],
    queryFn: () => getRawTirePurchaseReport(getAccessToken(), params),
    enabled,
  });
}
