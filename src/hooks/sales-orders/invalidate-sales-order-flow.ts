import type { QueryClient } from "@tanstack/react-query";

import { salesTrackingQueryKey } from "@/hooks/sales-tracking/useSalesTrackingQuery";

import { salesOrdersQueryKey } from "./useSalesOrdersQuery";

/** หน้ารายละเอียด SO / timeline — ต้อง refetch เมื่อกลับมาจาก picking/packing/delivery */
export const SALES_ORDER_LIVE_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
};

export async function invalidateSalesOrderFlowQueries(
  queryClient: QueryClient,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey }),
    queryClient.invalidateQueries({ queryKey: salesTrackingQueryKey }),
  ]);
}
