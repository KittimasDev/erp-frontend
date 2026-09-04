"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  cancelDeliverySchedule,
  createDeliverySchedule,
  getDeliverySchedules,
  getDeliveryScheduleStockStatus,
  rescheduleDeliverySchedule,
  updateDeliverySchedule,
} from "@/lib/api/delivery-schedules";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";
import { SALES_ORDER_LIVE_QUERY_OPTIONS } from "@/hooks/sales-orders/invalidate-sales-order-flow";
import { salesOrdersQueryKey } from "@/hooks/sales-orders/useSalesOrdersQuery";
import type {
  CancelDeliveryScheduleBody,
  CreateDeliveryScheduleBody,
  RescheduleDeliveryScheduleBody,
  UpdateDeliveryScheduleBody,
} from "@/types/delivery-schedules";

export const deliverySchedulesQueryKey = ["delivery-schedules"] as const;

export function deliverySchedulesBySalesOrderQueryKey(salesOrderId: string) {
  return [...deliverySchedulesQueryKey, "by-sales-order", salesOrderId] as const;
}

export function deliveryScheduleStockStatusQueryKey(scheduleId: string) {
  return [...deliverySchedulesQueryKey, "stock-status", scheduleId] as const;
}

/**
 * รายการรอบจัดส่ง — สดเท่ากับหัวใบสั่งขายที่แสดงอยู่หน้าเดียวกัน
 *
 * เดิมตกไปใช้ค่า global (stale 30 วิ) ขณะที่หัวใบข้าง ๆ ตั้ง staleTime 0
 * ความไม่เข้ากันนั้นทำให้ผู้ใช้เห็นหัวใบสด แต่รายการรอบเป็นของเมื่อครู่
 */
export function useDeliverySchedulesQuery(salesOrderId?: string) {
  return useQuery({
    queryKey: deliverySchedulesBySalesOrderQueryKey(salesOrderId ?? ""),
    enabled: Boolean(salesOrderId) && hasAccessToken(),
    ...SALES_ORDER_LIVE_QUERY_OPTIONS,
    queryFn: async () => {
      const res = await getDeliverySchedules(
        getAccessToken() ?? "",
        salesOrderId!,
      );
      return res.data;
    },
  });
}

/**
 * ของพร้อมจ่ายไหม — **ห้าม cache ยาว**
 *
 * backend คำนวณสดจากสต๊อกทุกครั้งเพราะของอาจถูกใบสั่งขายอื่นเอาไป
 * ถ้าฝั่งนี้ถือค่าเก่าไว้นาน หน้าจอจะบอกว่า "จ่ายได้" แล้วกดไปเจอ error
 * ตั้ง staleTime = 0 และรีเฟรชตอนกลับมาโฟกัสหน้าต่าง
 */
export function useDeliveryScheduleStockStatusQuery(
  scheduleId?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: deliveryScheduleStockStatusQueryKey(scheduleId ?? ""),
    enabled:
      Boolean(scheduleId) && hasAccessToken() && options?.enabled !== false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await getDeliveryScheduleStockStatus(
        getAccessToken() ?? "",
        scheduleId!,
      );
      return res.data;
    },
  });
}

/**
 * ทุก mutation ต้อง invalidate ทั้งรอบและใบสั่งขาย
 * เพราะยอดเงิน/ความคืบหน้าบนหัวใบคำนวณจากรอบ (recomputeOrderMoney)
 */
function useInvalidateSchedules(salesOrderId?: string) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: deliverySchedulesQueryKey }),
      queryClient.invalidateQueries({ queryKey: salesOrdersQueryKey }),
    ]);
    if (salesOrderId) {
      await queryClient.invalidateQueries({
        queryKey: deliverySchedulesBySalesOrderQueryKey(salesOrderId),
      });
    }
  };
}

export function useCreateDeliveryScheduleMutation(salesOrderId?: string) {
  const invalidate = useInvalidateSchedules(salesOrderId);
  return useMutation({
    mutationFn: async (params: {
      body: CreateDeliveryScheduleBody;
      /** เลขรุ่นของใบสั่งขาย ณ ตอนที่ผู้ใช้เปิดกล่อง */
      expectedVersion: number;
    }) => {
      const res = await createDeliverySchedule(
        getAccessToken() ?? "",
        salesOrderId!,
        params.body,
        params.expectedVersion,
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateDeliveryScheduleMutation(salesOrderId?: string) {
  const invalidate = useInvalidateSchedules(salesOrderId);
  return useMutation({
    mutationFn: async (params: {
      id: string;
      body: UpdateDeliveryScheduleBody;
      expectedVersion: number;
    }) => {
      const res = await updateDeliverySchedule(
        getAccessToken() ?? "",
        params.id,
        params.body,
        params.expectedVersion,
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}

/**
 * เลื่อนกำหนดส่ง — ยอดเงินไม่เปลี่ยน แต่ยัง invalidate ใบสั่งขายด้วย
 * เพราะ requested_delivery_date บนหัวใบสรุปมาจากรอบที่เร็วสุด
 */
export function useRescheduleDeliveryScheduleMutation(salesOrderId?: string) {
  const invalidate = useInvalidateSchedules(salesOrderId);
  return useMutation({
    mutationFn: async (params: {
      id: string;
      body: RescheduleDeliveryScheduleBody;
      expectedVersion: number;
    }) => {
      const res = await rescheduleDeliverySchedule(
        getAccessToken() ?? "",
        params.id,
        params.body,
        params.expectedVersion,
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelDeliveryScheduleMutation(salesOrderId?: string) {
  const invalidate = useInvalidateSchedules(salesOrderId);
  return useMutation({
    // body บังคับแล้ว — reason ว่างไม่ผ่าน validation ฝั่ง backend
    mutationFn: async (params: {
      id: string;
      body: CancelDeliveryScheduleBody;
      expectedVersion: number;
    }) => {
      const res = await cancelDeliverySchedule(
        getAccessToken() ?? "",
        params.id,
        params.body,
        params.expectedVersion,
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}
