"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getSalesTrackingDetail,
  getSalesTrackingList,
  getSalesTrackingSummary,
} from "@/lib/api/sales-tracking";
import { getAccessToken } from "@/lib/auth/token";
import type { SalesTrackingQueryParams } from "@/types/sales-tracking";

export const salesTrackingQueryKey = ["sales-tracking"] as const;

export function useSalesTrackingSummaryQuery() {
  return useQuery({
    queryKey: [...salesTrackingQueryKey, "summary"],
    queryFn: () => getSalesTrackingSummary(getAccessToken()),
  });
}

export function useSalesTrackingListQuery(params?: SalesTrackingQueryParams) {
  return useQuery({
    queryKey: [...salesTrackingQueryKey, "list", params ?? {}],
    queryFn: () => getSalesTrackingList(getAccessToken(), params),
  });
}

export function useSalesTrackingDetailQuery(salesOrderId?: string) {
  return useQuery({
    queryKey: [...salesTrackingQueryKey, "detail", salesOrderId],
    queryFn: () =>
      getSalesTrackingDetail(getAccessToken(), salesOrderId as string),
    enabled: Boolean(salesOrderId),
  });
}
