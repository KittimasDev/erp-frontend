"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  deleteDocumentAttachment,
  uploadDocumentAttachment,
} from "@/lib/api/document-attachments";
import {
  cancelPurchasePayment,
  confirmPurchasePayment,
  createPurchasePaymentFromPo,
} from "@/lib/api/purchase-payments";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import {
  ATTACHMENT_GROUP_PAYMENT,
  DOCUMENT_TYPE_SUPPLIER_PAYMENT,
} from "@/types/document-attachments";
import type {
  ConfirmSupplierPaymentBody,
  CreateSupplierPaymentFromPoBody,
} from "@/types/purchase-payments";
import { purchaseOrdersQueryKey } from "../purchase-orders/usePurchaseOrdersQuery";
import { purchasePaymentsQueryKey } from "./usePurchasePaymentsQuery";

export function useCreatePurchasePaymentFromPoMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: ({
      purchaseOrderId,
      body,
    }: {
      purchaseOrderId: string;
      body: CreateSupplierPaymentFromPoBody;
    }) => createPurchasePaymentFromPo(getAccessToken(), purchaseOrderId, body),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: purchasePaymentsQueryKey,
      });
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(res.message || t("สร้างใบสำคัญจ่ายสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("สร้างใบสำคัญจ่ายไม่สำเร็จ"),
      );
    },
  });
}

export function useConfirmPurchasePaymentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: ConfirmSupplierPaymentBody;
    }) => confirmPurchasePayment(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: purchasePaymentsQueryKey,
      });
      await queryClient.invalidateQueries({ queryKey: purchaseOrdersQueryKey });
      message.success(res.message || t("จ่ายเงินสำเร็จ"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : t("จ่ายเงินไม่สำเร็จ"),
      );
    },
  });
}

export function useCancelPurchasePaymentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationFn: (id: string) => cancelPurchasePayment(getAccessToken(), id),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: purchasePaymentsQueryKey,
      });
      message.success(res.message || t("ยกเลิกใบสำคัญจ่ายแล้ว"));
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : t("ยกเลิกใบสำคัญจ่ายไม่สำเร็จ"),
      );
    },
  });
}

export function useUploadPurchasePaymentAttachmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchasePaymentsQueryKey, "upload-attachment"],
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
        documentType: DOCUMENT_TYPE_SUPPLIER_PAYMENT,
        documentId,
        attachmentGroup: ATTACHMENT_GROUP_PAYMENT,
        description,
      }),
    onSuccess: (res, vars) => {
      message.success(res.message || t("อัปโหลดหลักฐานการจ่ายเงินสำเร็จ"));
      void queryClient.invalidateQueries({
        queryKey: [...purchasePaymentsQueryKey, "attachments", vars.documentId],
      });
    },
    onError: (err: Error) => {
      message.error(
        err instanceof ApiError ? err.message : t("อัปโหลดไฟล์ไม่สำเร็จ"),
      );
    },
  });
}

export function useDeletePurchasePaymentAttachmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const t = useT();

  return useMutation({
    mutationKey: [...purchasePaymentsQueryKey, "delete-attachment"],
    mutationFn: ({
      attachmentId,
    }: {
      attachmentId: string;
      documentId: string;
    }) => deleteDocumentAttachment(getAccessToken(), attachmentId),
    onSuccess: (res, vars) => {
      message.success(res.message || t("ลบไฟล์แนบสำเร็จ"));
      void queryClient.invalidateQueries({
        queryKey: [...purchasePaymentsQueryKey, "attachments", vars.documentId],
      });
    },
    onError: (err: Error) => {
      message.error(
        err instanceof ApiError ? err.message : t("ลบไฟล์แนบไม่สำเร็จ"),
      );
    },
  });
}
