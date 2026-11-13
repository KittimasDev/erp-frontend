"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eSignatureHistoryQueryKey } from "@/hooks/esign/useESignatureHistory";
import { App } from "antd";

import { useT } from "@/lib/i18n/useT";
import { ApiError } from "@/lib/api/client";
import { uploadDocumentAttachment } from "@/lib/api/document-attachments";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrderFromPr,
  createPurchaseOrderFromPrs,
  rejectPurchaseOrder,
  returnPurchaseOrderToDraft,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from "@/lib/api/purchase-orders";
import { getAccessToken } from "@/lib/auth/token";
import { poDeliverySchedulesQueryKey } from "@/hooks/po-delivery-schedules/usePoDeliverySchedulesQuery";
import {
  ATTACHMENT_GROUP_QUOTATION,
  DOCUMENT_TYPE_PO,
} from "@/types/document-attachments";
import type {
  CreatePurchaseOrderFromPrBody,
  CreatePurchaseOrderFromPrsBody,
  RejectPurchaseOrderBody,
  UpdatePurchaseOrderBody,
} from "@/types/purchase-orders";
import { purchaseOrdersQueryKey } from "./usePurchaseOrdersQuery";
import { purchaseRequestsQueryKey } from "@/hooks/purchase-requests/usePurchaseRequestsQuery";

export function useCreatePurchaseOrderFromPrMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "create-from-pr"],
    mutationFn: ({
      purchaseRequestId,
      body,
    }: {
      purchaseRequestId: string;
      body: CreatePurchaseOrderFromPrBody;
    }) => createPurchaseOrderFromPr(getAccessToken(), purchaseRequestId, body),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey }),
        queryClient.invalidateQueries({ queryKey: purchaseRequestsQueryKey }),
      ]);
      message.success(response.message || t("สร้างใบสั่งซื้อสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างใบสั่งซื้อไม่สำเร็จ"),
      );
    },
  });
}

/** รวมใบขอซื้อหลายใบเป็นใบสั่งซื้อใบเดียว — invalidate ชุดเดียวกับการสร้างจากใบเดียว */
export function useCreatePurchaseOrderFromPrsMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "create-from-prs"],
    mutationFn: (body: CreatePurchaseOrderFromPrsBody) =>
      createPurchaseOrderFromPrs(getAccessToken(), body),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey }),
        queryClient.invalidateQueries({ queryKey: purchaseRequestsQueryKey }),
      ]);
      message.success(response.message || t("สร้างใบสั่งซื้อสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("สร้างใบสั่งซื้อไม่สำเร็จ"),
      );
    },
  });
}

export function useUpdatePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "update"],
    mutationFn: ({ id, body }: { id: string; body: UpdatePurchaseOrderBody }) =>
      updatePurchaseOrder(getAccessToken(), id, body),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey }),
        queryClient.invalidateQueries({ queryKey: poDeliverySchedulesQueryKey }),
      ]);
      message.success(response.message || t("แก้ไขใบสั่งซื้อสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("แก้ไขใบสั่งซื้อไม่สำเร็จ"),
      );
    },
  });
}

/** จัดซื้อส่งใบสั่งซื้อให้หัวหน้าอนุมัติ (ร่าง → รออนุมัติ) */
export function useSubmitPurchaseOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "submit"],
    mutationFn: (id: string) => submitPurchaseOrder(getAccessToken(), id),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || t("ส่งอนุมัติใบสั่งซื้อแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ส่งอนุมัติไม่สำเร็จ"),
      );
    },
  });
}

/** หัวหน้าอนุมัติ (รออนุมัติ → อนุมัติแล้ว รอส่งสินค้า) */
export function useApprovePurchaseOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "approve"],
    mutationFn: (id: string) => approvePurchaseOrder(getAccessToken(), id),
    onSuccess: async (response) => {
      void queryClient.invalidateQueries({ queryKey: eSignatureHistoryQueryKey });
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || t("อนุมัติใบสั่งซื้อสำเร็จแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("อนุมัติไม่สำเร็จ"),
      );
    },
  });
}

export function useRejectPurchaseOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "reject"],
    mutationFn: ({ id, body }: { id: string; body: RejectPurchaseOrderBody }) =>
      rejectPurchaseOrder(getAccessToken(), id, body),
    onSuccess: async (response) => {
      void queryClient.invalidateQueries({ queryKey: eSignatureHistoryQueryKey });
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || t("ปฏิเสธใบสั่งซื้อแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ปฏิเสธไม่สำเร็จ"),
      );
    },
  });
}

/** หัวหน้าส่งกลับให้จัดซื้อแก้ไข (รออนุมัติ → ร่าง) */
export function useReturnPurchaseOrderToDraftMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "return-to-draft"],
    mutationFn: ({ id, body }: { id: string; body: RejectPurchaseOrderBody }) =>
      returnPurchaseOrderToDraft(getAccessToken(), id, body),
    onSuccess: async (response) => {
      void queryClient.invalidateQueries({ queryKey: eSignatureHistoryQueryKey });
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || t("ส่งกลับให้แก้ไขแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ส่งกลับแก้ไขไม่สำเร็จ"),
      );
    },
  });
}

export function useCancelPurchaseOrderMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "cancel"],
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelPurchaseOrder(getAccessToken(), id, { reason }),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(response.message || t("ยกเลิกใบสั่งซื้อแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("ยกเลิกไม่สำเร็จ"),
      );
    },
  });
}

export function useUploadPurchaseOrderAttachmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchaseOrdersQueryKey, "upload-attachment"],
    mutationFn: ({
      documentId,
      file,
      description,
    }: {
      documentId: string;
      file: File;
      description?: string;
    }) =>
      uploadDocumentAttachment(getAccessToken(), {
        file,
        documentType: DOCUMENT_TYPE_PO,
        documentId,
        attachmentGroup: ATTACHMENT_GROUP_QUOTATION,
        description,
      }),
    onSuccess: (res, vars) => {
      message.success(res.message || t("อัปโหลดใบเสนอราคาสำเร็จ"));
      void queryClient.invalidateQueries({
        queryKey: [...purchaseOrdersQueryKey, "attachments", vars.documentId],
      });
    },
    onError: (err: Error) => {
      message.error(
        err instanceof ApiError ? err.message : t("อัปโหลดไฟล์ไม่สำเร็จ"),
      );
    },
  });
}
