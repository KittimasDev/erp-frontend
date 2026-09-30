"use client";

import { useQuery } from "@tanstack/react-query";

import { getStockAdjustmentTypes } from "@/lib/api/stock-adjustment-types";
import { getAccessToken } from "@/lib/auth/token";
import type { StockAdjustmentTypeQueryParams } from "@/types/stock-adjustment-types";

export const stockAdjustmentTypesQueryKey = [
  "master-data",
  "stock-adjustment-types",
] as const;

export function useStockAdjustmentTypesQuery(
  params?: StockAdjustmentTypeQueryParams,
) {
  return useQuery({
    queryKey: [...stockAdjustmentTypesQueryKey, params ?? {}],
    queryFn: () => getStockAdjustmentTypes(getAccessToken(), params),
  });
}
