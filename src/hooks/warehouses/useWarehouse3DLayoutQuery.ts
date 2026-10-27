"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getWarehouse3DLayout,
  updateWarehouse3DLayout,
} from "@/lib/api/warehouses";
import { getAccessToken } from "@/lib/auth/token";
import type { Warehouse3DLayoutConfig } from "@/types/warehouse-3d";

export const warehouse3DLayoutQueryKey = (warehouseId: string) =>
  ["master-data", "warehouses", warehouseId, "layout-3d"] as const;

export function useWarehouse3DLayoutQuery(warehouseId: string) {
  return useQuery({
    queryKey: warehouse3DLayoutQueryKey(warehouseId),
    queryFn: () => getWarehouse3DLayout(getAccessToken(), warehouseId),
    enabled: Boolean(warehouseId),
    staleTime: 60_000,
  });
}

export function useUpdateWarehouse3DLayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      warehouseId,
      layout3dConfig,
    }: {
      warehouseId: string;
      layout3dConfig: Warehouse3DLayoutConfig;
    }) => updateWarehouse3DLayout(getAccessToken(), warehouseId, layout3dConfig),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: warehouse3DLayoutQueryKey(variables.warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: ["master-data", "warehouses"],
      });
    },
  });
}
