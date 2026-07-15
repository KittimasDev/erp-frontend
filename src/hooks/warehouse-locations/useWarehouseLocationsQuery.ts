"use client";

import { useQuery } from "@tanstack/react-query";

import { getWarehouseLocations } from "@/lib/api/warehouse-locations";
import { getAccessToken } from "@/lib/auth/token";
import type { WarehouseLocationQueryParams } from "@/types/warehouse-locations";

export const warehouseLocationsQueryKey = [
  "master-data",
  "warehouse-locations",
] as const;

export function useWarehouseLocationsQuery(
  params?: WarehouseLocationQueryParams,
) {
  return useQuery({
    queryKey: [...warehouseLocationsQueryKey, params ?? {}],
    queryFn: () => getWarehouseLocations(getAccessToken(), params),
  });
}
