import { apiFetch } from "./client";
import type {
  CancelDeliveryScheduleBody,
  CreateDeliveryScheduleBody,
  DeliveryScheduleApiResponse,
  DeliveryScheduleListApiResponse,
  DeliveryScheduleStockStatusApiResponse,
  UpdateDeliveryScheduleBody,
} from "@/types/delivery-schedules";

export function getDeliverySchedules(token: string, salesOrderId: string) {
  return apiFetch<DeliveryScheduleListApiResponse>(
    `/api/sales-orders/${salesOrderId}/delivery-schedules`,
    { method: "GET", token },
  );
}

export function createDeliverySchedule(
  token: string,
  salesOrderId: string,
  body: CreateDeliveryScheduleBody,
) {
  return apiFetch<DeliveryScheduleApiResponse>(
    `/api/sales-orders/${salesOrderId}/delivery-schedules`,
    { method: "POST", token, body },
  );
}

export function getDeliverySchedule(token: string, id: string) {
  return apiFetch<DeliveryScheduleApiResponse>(
    `/api/sales-orders/delivery-schedules/${id}`,
    { method: "GET", token },
  );
}

/**
 * ของพร้อมจ่ายไหม — คำนวณสดทุกครั้ง ไม่ cache ยาว
 * เพราะของอาจถูกใบสั่งขายอื่นเอาไปหลังจากที่เราอ่านมา
 */
export function getDeliveryScheduleStockStatus(token: string, id: string) {
  return apiFetch<DeliveryScheduleStockStatusApiResponse>(
    `/api/sales-orders/delivery-schedules/${id}/stock-status`,
    { method: "GET", token },
  );
}

export function updateDeliverySchedule(
  token: string,
  id: string,
  body: UpdateDeliveryScheduleBody,
) {
  return apiFetch<DeliveryScheduleApiResponse>(
    `/api/sales-orders/delivery-schedules/${id}`,
    { method: "PATCH", token, body },
  );
}

export function cancelDeliverySchedule(
  token: string,
  id: string,
  body: CancelDeliveryScheduleBody = {},
) {
  return apiFetch<DeliveryScheduleApiResponse>(
    `/api/sales-orders/delivery-schedules/${id}/cancel`,
    { method: "POST", token, body },
  );
}
