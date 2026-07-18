"use client";

import { useQuery } from "@tanstack/react-query";

import { getWarehouseLocation } from "@/lib/api/warehouse-locations";
import { getAccessToken } from "@/lib/auth/token";
import { warehouseLocationsQueryKey } from "./useWarehouseLocationsQuery";

export function useWarehouseLocationQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...warehouseLocationsQueryKey, "detail", id],
    queryFn: () => getWarehouseLocation(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
