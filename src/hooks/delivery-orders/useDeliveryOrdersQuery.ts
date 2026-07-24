"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getDeliveryOrder,
  getDeliveryOrders,
  getReadyPackingsForDelivery,
} from "@/lib/api/delivery-orders";
import { getAccessToken } from "@/lib/auth/token";
import type { DeliveryOrderQueryParams } from "@/types/delivery-orders";

export const deliveryOrdersQueryKey = ["delivery-orders"] as const;

export function useDeliveryOrdersQuery(params?: DeliveryOrderQueryParams) {
  return useQuery({
    queryKey: [...deliveryOrdersQueryKey, "list", params ?? {}],
    queryFn: () => getDeliveryOrders(getAccessToken(), params),
  });
}

export function useDeliveryOrderQuery(id?: string) {
  return useQuery({
    queryKey: [...deliveryOrdersQueryKey, "detail", id],
    queryFn: () => getDeliveryOrder(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useReadyPackingsForDeliveryQuery() {
  return useQuery({
    queryKey: [...deliveryOrdersQueryKey, "ready-packings"],
    queryFn: () => getReadyPackingsForDelivery(getAccessToken()),
  });
}
