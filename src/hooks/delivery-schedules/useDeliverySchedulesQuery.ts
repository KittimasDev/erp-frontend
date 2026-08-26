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
  updateDeliverySchedule,
} from "@/lib/api/delivery-schedules";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";
import { salesOrdersQueryKey } from "@/hooks/sales-orders/useSalesOrdersQuery";
import type {
  CancelDeliveryScheduleBody,
  CreateDeliveryScheduleBody,
  UpdateDeliveryScheduleBody,
} from "@/types/delivery-schedules";

export const deliverySchedulesQueryKey = ["delivery-schedules"] as const;

export function deliverySchedulesBySalesOrderQueryKey(salesOrderId: string) {
  return [...deliverySchedulesQueryKey, "by-sales-order", salesOrderId] as const;
}

export function deliveryScheduleStockStatusQueryKey(scheduleId: string) {
  return [...deliverySchedulesQueryKey, "stock-status", scheduleId] as const;
}

export function useDeliverySchedulesQuery(salesOrderId?: string) {
  return useQuery({
    queryKey: deliverySchedulesBySalesOrderQueryKey(salesOrderId ?? ""),
    enabled: Boolean(salesOrderId) && hasAccessToken(),
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
    mutationFn: async (body: CreateDeliveryScheduleBody) => {
      const res = await createDeliverySchedule(
        getAccessToken() ?? "",
        salesOrderId!,
        body,
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
    }) => {
      const res = await updateDeliverySchedule(
        getAccessToken() ?? "",
        params.id,
        params.body,
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}

export function useCancelDeliveryScheduleMutation(salesOrderId?: string) {
  const invalidate = useInvalidateSchedules(salesOrderId);
  return useMutation({
    mutationFn: async (params: {
      id: string;
      body?: CancelDeliveryScheduleBody;
    }) => {
      const res = await cancelDeliverySchedule(
        getAccessToken() ?? "",
        params.id,
        params.body ?? {},
      );
      return res.data;
    },
    onSuccess: invalidate,
  });
}
