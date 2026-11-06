"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelPicking,
  confirmPicking,
  createPickingFromDeliverySchedule,
  createPickingFromSalesOrder,
  updatePicking,
} from "@/lib/api/pickings";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreatePickingFromSalesOrderBody,
  UpdatePickingBody,
} from "@/types/pickings";
import { invalidateSalesOrderFlowQueries } from "@/hooks/sales-orders/invalidate-sales-order-flow";
import { notificationsQueryKey } from "@/hooks/notifications/useNotificationsQueries";

import { pickingsQueryKey } from "./usePickingsQuery";
import { useT } from "@/lib/i18n/useT";

function useInvalidate() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: pickingsQueryKey });
    await qc.invalidateQueries({ queryKey: notificationsQueryKey });
    await invalidateSalesOrderFlowQueries(qc);
  };
}

export function useCreatePickingFromSalesOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      salesOrderId,
      body,
    }: {
      salesOrderId: string;
      body?: CreatePickingFromSalesOrderBody;
    }) =>
      createPickingFromSalesOrder(getAccessToken(), salesOrderId, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("เปิดใบจ่ายสินค้าแล้ว"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("สร้างไม่สำเร็จ")),
  });
}

/**
 * เปิดใบจ่ายของรอบจัดส่งหนึ่งรอบ
 *
 * error ที่เจอบ่อยคือ "สต๊อกไม่พอสำหรับรอบจัดส่งนี้" — โชว์ข้อความจาก backend
 * ตรง ๆ เพราะมันบอกจำนวนที่ยังขาดมาให้แล้ว คนจะเอาไปเปิดใบขอผลิตต่อได้
 */
export function useCreatePickingFromScheduleMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      scheduleId,
      body,
    }: {
      scheduleId: string;
      body?: CreatePickingFromSalesOrderBody;
    }) => createPickingFromDeliverySchedule(getAccessToken(), scheduleId, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("เปิดใบจ่ายสินค้าแล้ว"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("สร้างไม่สำเร็จ")),
  });
}

export function useUpdatePickingMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePickingBody }) =>
      updatePicking(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("บันทึกสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("บันทึกไม่สำเร็จ")),
  });
}

export function useConfirmPickingMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => confirmPicking(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("ยืนยันและตัดสต๊อกสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("ยืนยันไม่สำเร็จ")),
  });
}

export function useCancelPickingMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelPicking(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("ยกเลิกสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("ยกเลิกไม่สำเร็จ")),
  });
}
