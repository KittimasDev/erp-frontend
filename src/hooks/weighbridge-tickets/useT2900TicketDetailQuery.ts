"use client";

import { useQuery } from "@tanstack/react-query";

import { getT2900ErpTicketDetail } from "@/lib/api/t2900";
import { getAccessToken } from "@/lib/auth/token";

export const t2900TicketDetailQueryKey = [
  "weighbridge",
  "t2900",
  "ticket-detail",
] as const;

export function useT2900TicketDetailQuery(tckNo: string) {
  return useQuery({
    queryKey: [...t2900TicketDetailQueryKey, tckNo],
    queryFn: () => getT2900ErpTicketDetail(getAccessToken(), tckNo),
    enabled: Boolean(tckNo),
    retry: false,
  });
}
