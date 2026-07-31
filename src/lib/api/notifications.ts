import { apiFetch } from "./client";
import type {
  NotificationListApiResponse,
  NotificationMarkAllReadApiResponse,
  NotificationMarkReadApiResponse,
  NotificationUnreadCountApiResponse,
} from "@/types/notifications";

export function getNotifications(token: string) {
  return apiFetch<NotificationListApiResponse>("/api/notifications", {
    method: "GET",
    token,
  });
}

export function getNotificationsUnreadCount(token: string) {
  return apiFetch<NotificationUnreadCountApiResponse>(
    "/api/notifications/unread-count",
    { method: "GET", token },
  );
}

export function markNotificationRead(token: string, id: string) {
  return apiFetch<NotificationMarkReadApiResponse>(
    `/api/notifications/${id}/read`,
    { method: "PATCH", token },
  );
}

export function markAllNotificationsRead(token: string) {
  return apiFetch<NotificationMarkAllReadApiResponse>(
    "/api/notifications/read-all",
    { method: "PATCH", token },
  );
}
