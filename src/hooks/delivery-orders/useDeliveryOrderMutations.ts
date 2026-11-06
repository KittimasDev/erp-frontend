"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelDeliveryOrder,
  confirmDeliveryOrder,
  createDeliveryOrderFromPacking,
  createDeliveryOrderFromPackings,
  deliverDeliveryOrder,
  updateDeliveryOrder,
} from "@/lib/api/delivery-orders";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateDeliveryOrderFromPackingBody,
  CreateDeliveryOrderFromPackingsBody,
  DeliverDeliveryOrderBody,
  UpdateDeliveryOrderBody,
} from "@/types/delivery-orders";
import { invalidateSalesOrderFlowQueries } from "@/hooks/sales-orders/invalidate-sales-order-flow";
import { returnNotesQueryKey } from "@/hooks/return-notes/useReturnNotesQuery";
import { deliveryOrdersQueryKey } from "./useDeliveryOrdersQuery";
import { useT } from "@/lib/i18n/useT";

function useInvalidate() {
  const qc = useQueryClient();
  return async () => {
    await qc.invalidateQueries({ queryKey: deliveryOrdersQueryKey });
    await invalidateSalesOrderFlowQueries(qc);
  };
}

export function useCreateDeliveryOrderFromPackingMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      packingId,
      body,
    }: {
      packingId: string;
      body?: CreateDeliveryOrderFromPackingBody;
    }) =>
      createDeliveryOrderFromPacking(getAccessToken(), packingId, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("เปิดใบส่งแล้ว"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("สร้างไม่สำเร็จ")),
  });
}

/** รวมหลายใบบรรจุ (SO เดียวกัน) เป็นใบส่งเดียว — 409 = มีคนใช้ใบบรรจุไปแล้ว ให้โหลดรายการใหม่ */
export function useCreateDeliveryOrderFromPackingsMutation() {
  const t = useT();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: CreateDeliveryOrderFromPackingsBody) =>
      createDeliveryOrderFromPackings(getAccessToken(), body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("สร้างใบส่งแล้ว"));
    },
    onError: async (e: Error) => {
      message.error(e instanceof ApiError ? e.message : t("สร้างไม่สำเร็จ"));
      if (e instanceof ApiError && e.status === 409) {
        await qc.invalidateQueries({ queryKey: deliveryOrdersQueryKey });
      }
    },
  });
}

export function useUpdateDeliveryOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDeliveryOrderBody }) =>
      updateDeliveryOrder(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("บันทึกสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("บันทึกไม่สำเร็จ")),
  });
}

export function useConfirmDeliveryOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => confirmDeliveryOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("ยืนยันสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("ยืนยันไม่สำเร็จ")),
  });
}

export function useDeliverDeliveryOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DeliverDeliveryOrderBody }) =>
      deliverDeliveryOrder(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      // ตีกลับ + คืนเข้าคลัง → backend สร้างใบคืนสินค้าให้ (badge รออนุมัติต้องขยับ)
      await qc.invalidateQueries({ queryKey: returnNotesQueryKey });
      message.success(res.message || t("บันทึกผลการส่งสำเร็จ"));
      if (res.data?.returnNoteNo) {
        message.success(
          t("สร้างใบคืนสินค้า {returnNoteNo} แล้ว (รออนุมัติ)", { returnNoteNo: res.data.returnNoteNo }),
        );
      }
      if (res.data?.redeliveryDeliveryOrderNo) {
        message.success(
          t("สร้างใบส่งสินค้าใหม่ {redeliveryDeliveryOrderNo} แล้ว (ร่าง)", { redeliveryDeliveryOrderNo: res.data.redeliveryDeliveryOrderNo }),
        );
      }
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("บันทึกผลการส่งไม่สำเร็จ")),
  });
}

export function useCancelDeliveryOrderMutation() {
  const t = useT();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cancelDeliveryOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || t("ยกเลิกสำเร็จ"));
    },
    onError: (e: Error) =>
      message.error(e instanceof ApiError ? e.message : t("ยกเลิกไม่สำเร็จ")),
  });
}
