"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { paymentVouchersKey } from "@/hooks/payment-vouchers/usePaymentVouchers";
import {
  applyAdjustments,
  cancelApPvQueueItem,
  issueApInvoicePv,
  approveApInvoice,
  cancelApInvoice,
  getAdjustmentCandidates,
  getApInvoiceDetail,
  getDepositInfo,
  rejectApInvoice,
  submitApInvoice,
  approveApDocument,
  cancelApDocument,
  createApDocument,
  getApDocument,
  getApDocuments,
  getApInvoiceOptions,
  getApPurchaseOrderOptions,
  getCreatedAps,
  getGrnCreateInfo,
  getPendingGrns,
  updateApDocument,
} from "@/lib/api/ap-documents";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ApDocumentKind,
  CreatedApQuery,
  PendingGrnQuery,
  ApDocumentQueryParams,
  SaveApDebitNoteBody,
  SaveApInvoiceBody,
} from "@/types/ap-documents";

/**
 * ใบตั้งหนี้กับใบเพิ่มหนี้ใช้ cache ราก "ap-documents" ร่วมกัน —
 * ยกเลิก/อนุมัติใบเพิ่มหนี้แล้ว หน้ารายละเอียดใบตั้งหนี้ (ยอดหลังปรับ) ต้องรีเฟรชด้วย
 */
export const apDocumentsQueryKey = ["ap-documents"] as const;

export function useApDocumentsQuery(kind: ApDocumentKind, params: ApDocumentQueryParams) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, kind, "list", params],
    queryFn: async () => (await getApDocuments(getAccessToken(), kind, params)).data,
  });
}

/** ตารางรอสร้างใบตั้งหนี้ (GRN ที่ยืนยันแล้ว) — query แยกจากตารางที่สร้างแล้ว */
export function usePendingGrnsQuery(params: PendingGrnQuery) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "pending-grns", params],
    queryFn: async () => (await getPendingGrns(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useCreatedApsQuery(params: CreatedApQuery) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "created", params],
    queryFn: async () => (await getCreatedAps(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useGrnCreateInfoQuery(grnId?: string | null, excludeApId?: string) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "grn-create-info", grnId, excludeApId],
    queryFn: async () => (await getGrnCreateInfo(getAccessToken(), grnId as string, excludeApId)).data,
    enabled: Boolean(grnId),
  });
}

/** รายละเอียดใบตั้งหนี้ครบทุก section (ยอดคงเหลือ มัดจำ ปรับหนี้ ใบวางบิล การจ่ายเงิน ประวัติ) */
export function useApInvoiceDetailQuery(id?: string) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "invoice-detail", id],
    queryFn: async () => (await getApInvoiceDetail(getAccessToken(), id as string)).data,
    enabled: Boolean(id),
  });
}

export function useDepositInfoQuery(purchaseOrderId?: string | null, excludeApId?: string) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "deposit-info", purchaseOrderId, excludeApId],
    queryFn: async () => (await getDepositInfo(getAccessToken(), purchaseOrderId as string, excludeApId)).data,
    enabled: Boolean(purchaseOrderId),
  });
}

export function useAdjustmentCandidatesQuery(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "adjustment-candidates", id],
    queryFn: async () => (await getAdjustmentCandidates(getAccessToken(), id)).data,
    enabled,
  });
}

export function useApDocumentQuery(kind: ApDocumentKind, id: string) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, kind, "detail", id],
    queryFn: async () => (await getApDocument(getAccessToken(), kind, id)).data,
    enabled: Boolean(id),
  });
}

export function useApPurchaseOrderOptionsQuery(creditorId?: string) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "po-options", creditorId],
    queryFn: async () =>
      (await getApPurchaseOrderOptions(getAccessToken(), creditorId as string)).data,
    enabled: Boolean(creditorId),
  });
}

export function useApInvoiceOptionsQuery(creditorId?: string) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "invoice-options", creditorId],
    queryFn: async () =>
      (await getApInvoiceOptions(getAccessToken(), creditorId as string)).data,
    enabled: Boolean(creditorId),
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: apDocumentsQueryKey });
}

export function useSaveApDocumentMutation(kind: ApDocumentKind, id?: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: SaveApInvoiceBody | SaveApDebitNoteBody) =>
      id
        ? updateApDocument(getAccessToken(), kind, id, body)
        : createApDocument(getAccessToken(), kind, body),
    onSuccess: invalidate,
  });
}

export function useApproveApDocumentMutation(kind: ApDocumentKind, id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => approveApDocument(getAccessToken(), kind, id),
    onSuccess: invalidate,
  });
}

export function useCancelApDocumentMutation(kind: ApDocumentKind, id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (reason?: string) => cancelApDocument(getAccessToken(), kind, id, reason),
    onSuccess: invalidate,
  });
}

/** ออกใบสำคัญจ่ายจาก AP (เข้าคิว PV) และยกเลิกรายการรอสร้าง PV — คิว PV/ยอดวางบิลเปลี่ยนด้วย */
export function useApInvoicePvMutation(id: string) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: apDocumentsQueryKey });
    void queryClient.invalidateQueries({ queryKey: paymentVouchersKey });
    void queryClient.invalidateQueries({ queryKey: ["billing-notes"] });
  };
  const issue = useMutation({
    mutationFn: (body: { amount: number; desiredPayDate?: string }) => issueApInvoicePv(getAccessToken(), id, body),
    onSuccess: refresh,
  });
  const cancelQueue = useMutation({
    mutationFn: (queueItemId: string) => cancelApPvQueueItem(getAccessToken(), id, queueItemId),
    onSuccess: refresh,
  });
  return { issue, cancelQueue };
}

/** action ของ workflow ใบตั้งหนี้: ส่งอนุมัติ / อนุมัติ / ไม่อนุมัติ / ยกเลิก / ปรับหนี้ */
export function useApInvoiceActionMutation(id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (v: {
      action: "submit" | "approve" | "reject" | "cancel" | "adjust";
      reason?: string;
      documentIds?: string[];
    }) => {
      const t = getAccessToken();
      switch (v.action) {
        case "submit":
          return submitApInvoice(t, id);
        case "approve":
          return approveApInvoice(t, id);
        case "reject":
          return rejectApInvoice(t, id, v.reason ?? "");
        case "cancel":
          return cancelApInvoice(t, id, v.reason);
        default:
          return applyAdjustments(t, id, v.documentIds ?? []);
      }
    },
    onSuccess: invalidate,
  });
}
