"use client";

import { useQuery } from "@tanstack/react-query";

import { getWarehouses } from "@/lib/api/warehouses";
import { getAccessToken } from "@/lib/auth/token";
import type { WarehouseQueryParams } from "@/types/warehouses";

export const warehousesQueryKey = ["master-data", "warehouses"] as const;

export function useWarehousesQuery(params?: WarehouseQueryParams) {
  return useQuery({
    queryKey: [...warehousesQueryKey, params ?? {}],
    queryFn: () => getWarehouses(getAccessToken(), params),
  });
}
