"use client";

import { useQuery } from "@tanstack/react-query";

import { getWarehouseTypes } from "@/lib/api/warehouse-types";
import { getAccessToken } from "@/lib/auth/token";
import type { WarehouseTypeQueryParams } from "@/types/warehouse-types";

export const warehouseTypesQueryKey = ["master-data", "warehouse-types"] as const;

export function useWarehouseTypesQuery(params?: WarehouseTypeQueryParams) {
  return useQuery({
    queryKey: [...warehouseTypesQueryKey, params ?? {}],
    queryFn: () => getWarehouseTypes(getAccessToken(), params),
  });
}
