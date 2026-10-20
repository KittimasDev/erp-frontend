"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { paymentVouchersKey } from "@/hooks/payment-vouchers/usePaymentVouchers";
import {
  addApCreditNoteRefund,
  applyAdjustments,
  applyApSupplierCredit,
  cancelApCreditNoteRefund,
  getSupplierCreditCandidates,
  rejectApDocument,
  submitApDocument,
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
  getPendingCharges,
  getPendingGrns,
  getPoCharges,
  updateApDocument,
} from "@/lib/api/ap-documents";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ApDocumentKind,
  ApInvoiceOptionsQuery,
  CreatedApQuery,
  PendingGrnQuery,
  ApDocumentQueryParams,
  RefundApCreditNoteBody,
  SaveApCreditNoteBody,
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

/** PO ที่ยังมีค่าใช้จ่ายเพิ่มเติมคงเหลือรอตั้งหนี้ */
export function usePendingChargesQuery(params: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "pending-charges", params],
    queryFn: async () => (await getPendingCharges(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

/** ข้อมูล PO + ค่าใช้จ่ายเพิ่มเติม (วงเงิน/ตั้งหนี้แล้ว/คงเหลือ) สำหรับหน้าสร้าง/แก้ AP */
export function usePoChargesQuery(purchaseOrderId?: string | null, excludeApId?: string) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "po-charges", purchaseOrderId, excludeApId],
    queryFn: async () => (await getPoCharges(getAccessToken(), purchaseOrderId as string, excludeApId)).data,
    enabled: Boolean(purchaseOrderId),
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

export function useApInvoiceOptionsQuery(
  params: ApInvoiceOptionsQuery | undefined,
  kind: "debitNote" | "creditNote" = "debitNote",
) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "invoice-options", kind, params ?? {}],
    queryFn: async () => (await getApInvoiceOptions(getAccessToken(), kind, params as ApInvoiceOptionsQuery)).data,
    enabled: Boolean(params?.creditorId),
    placeholderData: keepPreviousData,
  });
}

/** เครดิตผู้ขายคงเหลือที่นำมาใช้กับใบตั้งหนี้ใบนี้ได้ */
export function useSupplierCreditCandidatesQuery(apId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...apDocumentsQueryKey, "supplier-credit-candidates", apId],
    queryFn: async () => (await getSupplierCreditCandidates(getAccessToken(), apId)).data,
    enabled,
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: apDocumentsQueryKey });
}

export function useSaveApDocumentMutation(kind: ApDocumentKind, id?: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (body: SaveApInvoiceBody | SaveApDebitNoteBody | SaveApCreditNoteBody) =>
      id
        ? updateApDocument(getAccessToken(), kind, id, body)
        : createApDocument(getAccessToken(), kind, body),
    onSuccess: invalidate,
  });
}

export function useSubmitApDocumentMutation(kind: ApDocumentKind, id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => submitApDocument(getAccessToken(), kind, id),
    onSuccess: invalidate,
  });
}

export function useRejectApDocumentMutation(kind: ApDocumentKind, id: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (reason: string) => rejectApDocument(getAccessToken(), kind, id, reason),
    onSuccess: invalidate,
  });
}

/**
 * ใช้เครดิตผู้ขายหลายใบกับใบตั้งหนี้ใบเดียว (จากหน้าใบตั้งหนี้) — ทำทีละใบตามลำดับ
 * ถ้าใบใดไม่ผ่านจะหยุดและแจ้งว่าใบก่อนหน้าบันทึกไปแล้วกี่ใบ (แต่ละใบเป็นรายการแยก ย้อนด้วยการยกเลิก AP/ใบลดหนี้ไม่ได้ในทีเดียว)
 */
export function useApplySupplierCreditsMutation(apId: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (items: Array<{ noteId: string; amount: number }>) => {
      let done = 0;
      for (const item of items) {
        try {
          await applyApSupplierCredit(getAccessToken(), item.noteId, {
            apDocumentId: apId,
            amount: item.amount,
          });
          done += 1;
        } catch (error) {
          const text = error instanceof Error ? error.message : "ใช้เครดิตไม่สำเร็จ";
          throw new Error(done > 0 ? `${text} (ใช้เครดิตสำเร็จก่อนหน้านี้ ${done} ใบ)` : text);
        }
      }
      return done;
    },
    onSuccess: invalidate,
    onError: invalidate,
  });
}

/** รับเงินคืน / ยกเลิกรายการรับเงินคืน / ใช้เครดิตผู้ขาย ของใบลดหนี้ — รายละเอียดใบตั้งหนี้ต้องรีเฟรชด้วย */
export function useApCreditNoteSettlementMutations(id: string) {
  const invalidate = useInvalidateAll();
  const refund = useMutation({
    mutationFn: (body: RefundApCreditNoteBody) => addApCreditNoteRefund(getAccessToken(), id, body),
    onSuccess: invalidate,
  });
  const cancelRefund = useMutation({
    mutationFn: (v: { refundId: string; reason: string }) =>
      cancelApCreditNoteRefund(getAccessToken(), id, v.refundId, v.reason),
    onSuccess: invalidate,
  });
  const applyCredit = useMutation({
    mutationFn: (body: { apDocumentId: string; amount: number }) =>
      applyApSupplierCredit(getAccessToken(), id, body),
    onSuccess: invalidate,
  });
  return { refund, cancelRefund, applyCredit };
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
