"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPicking,
  getPickings,
  getReadySalesOrdersForPicking,
} from "@/lib/api/pickings";
import { getAccessToken } from "@/lib/auth/token";
import type { PickingQueryParams } from "@/types/pickings";

export const pickingsQueryKey = ["pickings"] as const;

export function usePickingsQuery(params?: PickingQueryParams) {
  return useQuery({
    queryKey: [...pickingsQueryKey, "list", params ?? {}],
    queryFn: () => getPickings(getAccessToken(), params),
  });
}

export function usePickingQuery(id?: string) {
  return useQuery({
    queryKey: [...pickingsQueryKey, "detail", id],
    queryFn: () => getPicking(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useReadySalesOrdersForPickingQuery() {
  return useQuery({
    queryKey: [...pickingsQueryKey, "ready-sales-orders"],
    queryFn: () => getReadySalesOrdersForPicking(getAccessToken()),
  });
}
