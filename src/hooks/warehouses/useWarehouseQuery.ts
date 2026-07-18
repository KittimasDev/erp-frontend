"use client";

import { useQuery } from "@tanstack/react-query";

import { getWarehouse } from "@/lib/api/warehouses";
import { getAccessToken } from "@/lib/auth/token";
import { warehousesQueryKey } from "./useWarehousesQuery";

export function useWarehouseQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...warehousesQueryKey, "detail", id],
    queryFn: () => getWarehouse(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
