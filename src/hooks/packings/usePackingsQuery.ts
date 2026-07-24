"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getPacking,
  getPackings,
  getReadyPickingsForPacking,
} from "@/lib/api/packings";
import { getAccessToken } from "@/lib/auth/token";
import type { PackingQueryParams } from "@/types/packings";

export const packingsQueryKey = ["packings"] as const;

export function usePackingsQuery(params?: PackingQueryParams) {
  return useQuery({
    queryKey: [...packingsQueryKey, "list", params ?? {}],
    queryFn: () => getPackings(getAccessToken(), params),
  });
}

export function usePackingQuery(id?: string) {
  return useQuery({
    queryKey: [...packingsQueryKey, "detail", id],
    queryFn: () => getPacking(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useReadyPickingsForPackingQuery() {
  return useQuery({
    queryKey: [...packingsQueryKey, "ready-pickings"],
    queryFn: () => getReadyPickingsForPacking(getAccessToken()),
  });
}
