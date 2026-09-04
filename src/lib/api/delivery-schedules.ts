import { apiFetch } from "./client";
import type {
  CancelDeliveryScheduleBody,
  CreateDeliveryScheduleBody,
  DeliveryScheduleApiResponse,
  DeliveryScheduleListApiResponse,
  DeliveryScheduleStockStatusApiResponse,
  RescheduleDeliveryScheduleBody,
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
  /** เลขรุ่นของ *ใบสั่งขาย* — ยังไม่มีรอบให้เทียบ และจำนวนตั้งต้นมาจากยอดทั้งใบ */
  expectedVersion: number,
) {
  return apiFetch<DeliveryScheduleApiResponse>(
    `/api/sales-orders/${salesOrderId}/delivery-schedules`,
    { method: "POST", token, body, ifMatch: expectedVersion },
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
  /** เลขรุ่นของรอบนี้ — แก้รอบอื่นพร้อมกันไม่ชนกัน */
  expectedVersion: number,
) {
  return apiFetch<DeliveryScheduleApiResponse>(
    `/api/sales-orders/delivery-schedules/${id}`,
    { method: "PATCH", token, body, ifMatch: expectedVersion },
  );
}

/**
 * เลื่อนกำหนดส่ง — แตะวันเท่านั้น จำนวนและยอดเงินไม่เปลี่ยน
 * แยกจาก updateDeliverySchedule เพราะทำได้กับรอบที่คลังเริ่มทำงานไปแล้วด้วย
 */
export function rescheduleDeliverySchedule(
  token: string,
  id: string,
  body: RescheduleDeliveryScheduleBody,
  expectedVersion: number,
) {
  return apiFetch<DeliveryScheduleApiResponse>(
    `/api/sales-orders/delivery-schedules/${id}/reschedule`,
    { method: "POST", token, body, ifMatch: expectedVersion },
  );
}

/** ยกเลิกรอบ — reason บังคับ ไม่มี default ว่างอีกแล้ว */
export function cancelDeliverySchedule(
  token: string,
  id: string,
  body: CancelDeliveryScheduleBody,
  expectedVersion: number,
) {
  return apiFetch<DeliveryScheduleApiResponse>(
    `/api/sales-orders/delivery-schedules/${id}/cancel`,
    { method: "POST", token, body, ifMatch: expectedVersion },
  );
}
