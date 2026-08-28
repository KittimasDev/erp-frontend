"use client";

import { useQuery } from "@tanstack/react-query";

import { getT2900OutboundTickets } from "@/lib/api/t2900";
import { getAccessToken } from "@/lib/auth/token";
import type { T2900OutboundTicketsQuery } from "@/types/t2900";

export const t2900OutboundTicketsQueryKey = [
  "weighbridge",
  "t2900",
  "outbound-weighing-tickets",
] as const;

export function useT2900OutboundTicketsQuery(
  params: T2900OutboundTicketsQuery,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...t2900OutboundTicketsQueryKey, params],
    queryFn: () => getT2900OutboundTickets(getAccessToken(), params),
    enabled: options?.enabled ?? true,
    retry: false,
  });
}
