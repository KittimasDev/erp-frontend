import { apiFetch } from "./client";
import type {
  NotificationEventDetailApiResponse,
  NotificationEventListApiResponse,
  NotificationEventTestApiResponse,
  UpdateNotificationEventRolesBody,
} from "@/types/notification-settings";

export function getNotificationEvents(token: string) {
  return apiFetch<NotificationEventListApiResponse>(
    "/api/notification-settings/events",
    { method: "GET", token },
  );
}

export function getNotificationEvent(token: string, eventCode: string) {
  return apiFetch<NotificationEventDetailApiResponse>(
    `/api/notification-settings/events/${encodeURIComponent(eventCode)}`,
    { method: "GET", token },
  );
}

export function updateNotificationEventRoles(
  token: string,
  eventCode: string,
  body: UpdateNotificationEventRolesBody,
) {
  return apiFetch<NotificationEventDetailApiResponse>(
    `/api/notification-settings/events/${encodeURIComponent(eventCode)}`,
    { method: "PATCH", token, body },
  );
}

export function testNotificationEvent(token: string, eventCode: string) {
  return apiFetch<NotificationEventTestApiResponse>(
    `/api/notification-settings/events/${encodeURIComponent(eventCode)}/test`,
    { method: "POST", token },
  );
}
