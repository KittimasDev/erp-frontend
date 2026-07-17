"use client";

import { useQuery } from "@tanstack/react-query";

import { getTicketClassification } from "@/lib/api/raw-tire-purchase-receipts";
import { getAccessToken } from "@/lib/auth/token";

export const ticketClassificationQueryKey = [
  "weighbridge",
  "tickets",
  "classification",
] as const;

export function useTicketClassificationQuery(ticketId: string) {
  return useQuery({
    queryKey: [...ticketClassificationQueryKey, ticketId],
    queryFn: () => getTicketClassification(getAccessToken(), ticketId),
    enabled: Boolean(ticketId),
  });
}
