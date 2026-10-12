"use client";

import { useQuery } from "@tanstack/react-query";

import { getRawTirePurchaseMonthlyReport } from "@/lib/api/raw-tire-purchase-receipts";
import { getAccessToken } from "@/lib/auth/token";
import type { RawTirePurchaseReportQueryParams } from "@/types/raw-tire-purchase-reports";

import { rawTirePurchaseReportQueryKey } from "./useRawTirePurchaseReportQuery";

/** รายเดือน — key ใต้ราก "raw-tire-purchase-report" เดียวกับรายวัน ล้างพร้อมกันได้ */
export function useRawTirePurchaseMonthlyReportQuery(
  params: RawTirePurchaseReportQueryParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [...rawTirePurchaseReportQueryKey, "monthly", params],
    queryFn: () => getRawTirePurchaseMonthlyReport(getAccessToken(), params),
    enabled,
  });
}
