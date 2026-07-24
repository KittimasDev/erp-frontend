"use client";

import { useQuery } from "@tanstack/react-query";

import { getWeighbridgeTicket } from "@/lib/api/weighbridge-tickets";
import { getAccessToken } from "@/lib/auth/token";

export const weighbridgeTicketQueryKey = ["weighbridge", "tickets"] as const;

export function useWeighbridgeTicketQuery(id: string) {
  return useQuery({
    queryKey: [...weighbridgeTicketQueryKey, id],
    queryFn: () => getWeighbridgeTicket(getAccessToken(), id),
    enabled: Boolean(id),
    refetchOnMount: "always",
    refetchInterval: 2000,
    refetchIntervalInBackground: false,
  });
}
