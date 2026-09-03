"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  cancelSalesOrder,
  confirmSalesOrder,
  createSalesOrderFromQuotation,
  updateSalesOrderCustomerPo,
  updateSalesOrderHeader,
  updateSalesOrderItems,
} from "@/lib/api/sales-orders";
import {
  deleteDocumentAttachment,
  uploadDocumentAttachment,
} from "@/lib/api/document-attachments";
import { ApiError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/token";
import {
  ATTACHMENT_GROUP_CUSTOMER_PO,
  DOCUMENT_TYPE_SO,
} from "@/types/document-attachments";
import type {
  CreateSalesOrderFromQuotationBody,
  UpdateSalesOrderCustomerPoBody,
  UpdateSalesOrderHeaderBody,
  UpdateSalesOrderItemsBody,
} from "@/types/sales-orders";

import { salesOrdersQueryKey } from "./useSalesOrdersQuery";
import { invalidateSalesOrderFlowQueries } from "./invalidate-sales-order-flow";
import { quotationsQueryKey } from "@/hooks/quotations/useQuotationsQuery";

function useInvalidateSalesOrders() {
  const queryClient = useQueryClient();
  return () => invalidateSalesOrderFlowQueries(queryClient);
}

export function useCreateSalesOrderFromQuotationMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "create-from-quotation"],
    mutationFn: ({
      quotationId,
      body,
    }: {
      quotationId: string;
      body?: CreateSalesOrderFromQuotationBody;
    }) => createSalesOrderFromQuotation(getAccessToken(), quotationId, body),
    onSuccess: async (res) => {
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: quotationsQueryKey });
      message.success(res.message || "สร้างใบสั่งขายสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "สร้างใบสั่งขายไม่สำเร็จ",
      );
    },
  });
}

export function useConfirmSalesOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "confirm"],
    mutationFn: (id: string) => confirmSalesOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยืนยันใบสั่งขายสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยืนยันใบสั่งขายไม่สำเร็จ",
      );
    },
  });
}

export function useCancelSalesOrderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "cancel"],
    mutationFn: (id: string) => cancelSalesOrder(getAccessToken(), id),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "ยกเลิกใบสั่งขายสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError ? error.message : "ยกเลิกใบสั่งขายไม่สำเร็จ",
      );
    },
  });
}

/*
 * ถอด 4 hook ออกแล้ว (2026-08-26): useConfirmStockVerificationMutation,
 * useReserveSalesOrderLineMutation, useReleaseSalesOrderLineMutation,
 * useReserveAllEligibleSalesOrderLinesMutation (+ helper useReservationMutation)
 *
 * ทั้งหมดยิง endpoint ที่ถูกถอดออกฝั่ง backend แล้ว — การจองด้วยมือระดับ
 * ใบสั่งขายทำให้จองซ้ำกับการจองระดับรอบ (สั่ง 2 กลายเป็นจองไว้ 4)
 * ของถูกจองตอนสร้างใบสั่งขาย — เปิดใบจ่ายยกแถวเดิมมาใช้ ไม่จองซ้ำ
 */

export function useUploadSalesOrderAttachmentMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "upload-attachment"],
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
        documentType: DOCUMENT_TYPE_SO,
        documentId,
        attachmentGroup: ATTACHMENT_GROUP_CUSTOMER_PO,
        description,
      }),
    onSuccess: (res, vars) => {
      message.success(res.message || "อัปโหลดไฟล์หลักฐานสำเร็จ");
      void queryClient.invalidateQueries({
        queryKey: [...salesOrdersQueryKey, "attachments", vars.documentId],
      });
    },
    onError: (err: Error) => {
      message.error(
        err instanceof ApiError ? err.message : "อัปโหลดไฟล์ไม่สำเร็จ",
      );
    },
  });
}

export function useDeleteSalesOrderAttachmentMutation() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "delete-attachment"],
    mutationFn: ({
      attachmentId,
      documentId,
    }: {
      attachmentId: string;
      documentId: string;
    }) => deleteDocumentAttachment(getAccessToken(), attachmentId),
    onSuccess: (res, vars) => {
      message.success(res.message || "ลบไฟล์แนบสำเร็จ");
      void queryClient.invalidateQueries({
        queryKey: [...salesOrdersQueryKey, "attachments", vars.documentId],
      });
    },
    onError: (err: Error) => {
      message.error(
        err instanceof ApiError ? err.message : "ลบไฟล์แนบไม่สำเร็จ",
      );
    },
  });
}

/** รายการสินค้าล็อกตามใบเสนอราคา — API คืน 400 ถ้าเรียก */
export function useUpdateSalesOrderItemsMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "update-items"],
    mutationFn: ({ id, body }: { id: string; body: UpdateSalesOrderItemsBody }) =>
      updateSalesOrderItems(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "บันทึกรายการสินค้าสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "บันทึกรายการสินค้าไม่สำเร็จ",
      );
    },
  });
}

export function useUpdateSalesOrderCustomerPoMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "customer-po"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateSalesOrderCustomerPoBody;
    }) => updateSalesOrderCustomerPo(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "บันทึกเลข PO ลูกค้าสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "บันทึกเลข PO ลูกค้าไม่สำเร็จ",
      );
    },
  });
}

export function useUpdateSalesOrderHeaderMutation() {
  const { message } = App.useApp();
  const invalidate = useInvalidateSalesOrders();

  return useMutation({
    mutationKey: [...salesOrdersQueryKey, "header"],
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateSalesOrderHeaderBody;
    }) => updateSalesOrderHeader(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await invalidate();
      message.success(res.message || "บันทึกหัวเอกสารสำเร็จ");
    },
    onError: (error: Error) => {
      message.error(
        error instanceof ApiError
          ? error.message
          : "บันทึกหัวเอกสารไม่สำเร็จ",
      );
    },
  });
}
