"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotificationEvent,
  getNotificationEvents,
  testNotificationEvent,
  updateNotificationEventRoles,
} from "@/lib/api/notification-settings";
import { getAccessToken } from "@/lib/auth/token";
import type { UpdateNotificationEventRolesBody } from "@/types/notification-settings";

export const notificationSettingsQueryKey = ["notification-settings"] as const;

export function useNotificationEventsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...notificationSettingsQueryKey, "events"],
    queryFn: () => getNotificationEvents(getAccessToken()),
    enabled: options?.enabled ?? true,
    refetchOnMount: "always",
    staleTime: 0,
  });
}

export function useNotificationEventQuery(
  eventCode?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...notificationSettingsQueryKey, "event", eventCode ?? ""],
    queryFn: () => getNotificationEvent(getAccessToken(), eventCode as string),
    enabled: (options?.enabled ?? true) && Boolean(eventCode),
  });
}

export function useUpdateNotificationEventRolesMutation(eventCode: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateNotificationEventRolesBody) =>
      updateNotificationEventRoles(getAccessToken(), eventCode, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: notificationSettingsQueryKey,
      });
    },
  });
}

export function useTestNotificationEventMutation(eventCode: string) {
  return useMutation({
    mutationFn: () => testNotificationEvent(getAccessToken(), eventCode),
  });
}
