import { apiFetch } from "./client";
import type {
  CancelPoReceivingBody,
  CreatePoDeliveryScheduleBody,
  PoDeliveryScheduleListResponse,
  PoDeliveryScheduleResponse,
  ReschedulePoDeliveryBody,
} from "@/types/po-delivery-schedules";

export function getPoDeliverySchedules(token: string, purchaseOrderId: string) {
  return apiFetch<PoDeliveryScheduleListResponse>(
    `/api/purchase-orders/${purchaseOrderId}/delivery-schedules`,
    { method: "GET", token },
  );
}

export function createPoDeliverySchedule(
  token: string,
  purchaseOrderId: string,
  body: CreatePoDeliveryScheduleBody,
) {
  return apiFetch<PoDeliveryScheduleResponse>(
    `/api/purchase-orders/${purchaseOrderId}/delivery-schedules`,
    { method: "POST", token, body },
  );
}

export function updatePoDeliverySchedule(
  token: string,
  id: string,
  body: CreatePoDeliveryScheduleBody,
) {
  return apiFetch<PoDeliveryScheduleResponse>(
    `/api/purchase-orders/delivery-schedules/${id}`,
    { method: "PATCH", token, body },
  );
}

export function reschedulePoDeliverySchedule(
  token: string,
  id: string,
  body: ReschedulePoDeliveryBody,
) {
  return apiFetch<PoDeliveryScheduleResponse>(
    `/api/purchase-orders/delivery-schedules/${id}/reschedule`,
    { method: "POST", token, body },
  );
}

export function cancelPoRoundReceiving(
  token: string,
  id: string,
  body: CancelPoReceivingBody,
) {
  return apiFetch<PoDeliveryScheduleResponse>(
    `/api/purchase-orders/delivery-schedules/${id}/cancel-receiving`,
    { method: "POST", token, body },
  );
}

export function closePoRoundRemaining(
  token: string,
  id: string,
  body: CancelPoReceivingBody,
) {
  return apiFetch<PoDeliveryScheduleResponse>(
    `/api/purchase-orders/delivery-schedules/${id}/close-remaining`,
    { method: "POST", token, body },
  );
}
