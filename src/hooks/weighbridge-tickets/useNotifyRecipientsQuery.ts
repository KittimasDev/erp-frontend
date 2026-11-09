"use client";

import { useQuery } from "@tanstack/react-query";

import { getNotifyRecipients } from "@/lib/api/weighbridge-tickets";
import { getAccessToken } from "@/lib/auth/token";

export const notifyRecipientsQueryKey = ["weighbridge", "notify-recipients"] as const;

export function useNotifyRecipientsQuery(enabled = true) {
  return useQuery({
    queryKey: notifyRecipientsQueryKey,
    queryFn: () => getNotifyRecipients(getAccessToken()),
    enabled,
  });
}
