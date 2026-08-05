"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getNotifications,
  getNotificationsUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";

export const notificationsQueryKey = ["notifications"] as const;

/** ดึง noti บ่อยขึ้น — หลังอนุมัติเบิกควร invalidate ทันทีด้วย */
const POLL_MS = 5_000;

/** หยุด poll ซ้ำเมื่อ API ล้ม (เช่น backend ยังไม่รัน) — ลด log ECONNREFUSED ใน terminal */
function notificationPollInterval(query: {
  state: { status: string };
}): number | false {
  if (query.state.status === "error") {
    return false;
  }
  return POLL_MS;
}

export function useNotificationsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...notificationsQueryKey, "list"],
    queryFn: () => getNotifications(getAccessToken()),
    enabled: (options?.enabled ?? true) && hasAccessToken(),
    refetchInterval: notificationPollInterval,
    refetchOnWindowFocus: (query) => query.state.status !== "error",
  });
}

export function useNotificationsUnreadCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [...notificationsQueryKey, "unread-count"],
    queryFn: () => getNotificationsUnreadCount(getAccessToken()),
    enabled: (options?.enabled ?? true) && hasAccessToken(),
    refetchInterval: notificationPollInterval,
    refetchOnWindowFocus: (query) => query.state.status !== "error",
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(getAccessToken(), id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(getAccessToken()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });
}
