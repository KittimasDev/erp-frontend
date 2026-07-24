"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import {
  approveStockAdjustment,
  cancelStockAdjustment,
  createStockAdjustment,
  rejectStockAdjustment,
  submitStockAdjustment,
  updateStockAdjustment,
  uploadDocumentAttachment,
} from "@/lib/api/stock-adjustments";
import { getAccessToken } from "@/lib/auth/token";
import type {
  CreateStockAdjustmentBody,
  RejectStockAdjustmentBody,
  UpdateStockAdjustmentBody,
} from "@/types/stock-adjustments";
import {
  DOCUMENT_TYPE_STOCK_ADJUSTMENT,
  stockAdjustmentsQueryKey,
} from "./useStockAdjustmentsQuery";

export function useCreateStockAdjustmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (body: CreateStockAdjustmentBody) =>
      createStockAdjustment(getAccessToken(), body),
    onSuccess: (res) => {
      message.success(res.message || "สร้างใบปรับปรุงสต๊อกสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockAdjustmentsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "สร้างใบปรับปรุงสต๊อกไม่สำเร็จ");
    },
  });
}

export function useUpdateStockAdjustmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateStockAdjustmentBody }) =>
      updateStockAdjustment(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "บันทึกใบปรับปรุงสต๊อกสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockAdjustmentsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "บันทึกใบปรับปรุงสต๊อกไม่สำเร็จ");
    },
  });
}

export function useSubmitStockAdjustmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => submitStockAdjustment(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ส่งอนุมัติแล้ว");
      void queryClient.invalidateQueries({ queryKey: stockAdjustmentsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "ส่งอนุมัติไม่สำเร็จ");
    },
  });
}

export function useCancelStockAdjustmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => cancelStockAdjustment(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "ยกเลิกใบปรับปรุงสต๊อกแล้ว");
      void queryClient.invalidateQueries({ queryKey: stockAdjustmentsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "ยกเลิกไม่สำเร็จ");
    },
  });
}

export function useApproveStockAdjustmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: (id: string) => approveStockAdjustment(getAccessToken(), id),
    onSuccess: (res) => {
      message.success(res.message || "อนุมัติและปรับปรุงสต๊อกสำเร็จ");
      void queryClient.invalidateQueries({ queryKey: stockAdjustmentsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "อนุมัติไม่สำเร็จ");
    },
  });
}

export function useRejectStockAdjustmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body?: RejectStockAdjustmentBody;
    }) => rejectStockAdjustment(getAccessToken(), id, body),
    onSuccess: (res) => {
      message.success(res.message || "ไม่อนุมัติใบปรับปรุงสต๊อกแล้ว");
      void queryClient.invalidateQueries({ queryKey: stockAdjustmentsQueryKey });
    },
    onError: (err: Error) => {
      message.error(err.message || "ปฏิเสธไม่สำเร็จ");
    },
  });
}

export function useUploadStockAdjustmentAttachmentMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  return useMutation({
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
        documentType: DOCUMENT_TYPE_STOCK_ADJUSTMENT,
        documentId,
        description,
      }),
    onSuccess: (res, vars) => {
      message.success(res.message || "อัปโหลดไฟล์สำเร็จ");
      void queryClient.invalidateQueries({
        queryKey: [...stockAdjustmentsQueryKey, "attachments", vars.documentId],
      });
    },
    onError: (err: Error) => {
      message.error(err.message || "อัปโหลดไฟล์ไม่สำเร็จ");
    },
  });
}
