"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getAvailableLocations,
  getDispatchOrder,
  getDispatchOrders,
} from "@/lib/api/dispatch-orders";
import { getAccessToken } from "@/lib/auth/token";
import type { DispatchOrderQueryParams } from "@/types/dispatch-orders";

export const dispatchOrdersQueryKey = ["dispatch-orders"] as const;

export function useDispatchOrdersQuery(params?: DispatchOrderQueryParams) {
  return useQuery({
    queryKey: [...dispatchOrdersQueryKey, "list", params ?? {}],
    queryFn: () => getDispatchOrders(getAccessToken(), params),
  });
}

export function useDispatchOrderQuery(id?: string) {
  return useQuery({
    queryKey: [...dispatchOrdersQueryKey, "detail", id],
    queryFn: () => getDispatchOrder(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useAvailableLocationsQuery(params: {
  itemId: string;
  warehouseId?: string;
}) {
  return useQuery({
    queryKey: [
      ...dispatchOrdersQueryKey,
      "available-locations",
      params.itemId,
      params.warehouseId,
    ],
    queryFn: () =>
      getAvailableLocations(getAccessToken(), {
        itemId: params.itemId,
        warehouseId: params.warehouseId as string,
      }),
    enabled: Boolean(params.warehouseId),
  });
}
