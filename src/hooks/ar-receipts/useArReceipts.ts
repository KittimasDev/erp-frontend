"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  applyCredit,
  cancelArRefund,
  createArRefund,
  getArRefunds,
  getCreditLedger,
  getDepositStatus,
  getSalesOrderFinance,
  cancelArReceipt,
  createArReceipt,
  getArAwaitingOrders,
  getArPaymentHistory,
  getArReceipt,
  getArReceipts,
  getCustomerCredit,
  getOutstandingArInvoices,
} from "@/lib/api/ar-receipts";
import { getAccessToken } from "@/lib/auth/token";
import { useT } from "@/lib/i18n/useT";
import { salesInvoicesQueryKey } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import { arBillingNotesQueryKey } from "@/hooks/ar-billing-notes/useArBillingNotes";
import type {
  ApplyCreditBody,
  ArReceiptQuery,
  AwaitingOrdersQuery,
  CreateArReceiptBody,
  CreateArRefundBody,
} from "@/types/ar-receipts";

export const arReceiptsQueryKey = ["ar-receipts"] as const;

export function useArReceiptsQuery(params: ArReceiptQuery) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "list", params],
    queryFn: async () => (await getArReceipts(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

/** SO ที่รอรับเงิน — ข้อมูลเปลี่ยนเมื่อมีรับชำระ/ตั้ง AR จึงใช้ prefix เดียวกับ ar-receipts (invalidate ร่วมกันได้) */
export function useArAwaitingOrdersQuery(params: AwaitingOrdersQuery) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "awaiting-orders", params],
    queryFn: async () => (await getArAwaitingOrders(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useArReceiptQuery(id?: string) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "detail", id],
    queryFn: async () => (await getArReceipt(getAccessToken(), id as string)).data,
    enabled: Boolean(id),
  });
}

export function useOutstandingArInvoicesQuery(customerId?: string) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "outstanding", customerId],
    queryFn: async () => (await getOutstandingArInvoices(getAccessToken(), customerId as string)).data,
    enabled: Boolean(customerId),
  });
}

export function useCustomerCreditQuery(customerId?: string) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "credit", customerId],
    queryFn: async () => (await getCustomerCredit(getAccessToken(), customerId as string)).data,
    enabled: Boolean(customerId),
  });
}

export function useArPaymentHistoryQuery(params: ArReceiptQuery) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "history", params],
    queryFn: async () => (await getArPaymentHistory(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

function useAfter() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return {
    // รับชำระ/ยกเลิกกระทบยอดค้างของ AR และรายการรอวางบิล
    invalidate: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: arReceiptsQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesInvoicesQueryKey }),
        queryClient.invalidateQueries({ queryKey: arBillingNotesQueryKey }),
      ]),
    fail: (e: unknown, fallback: string) => message.error(e instanceof ApiError ? e.message : fallback),
    ok: (text: string) => message.success(text),
  };
}

export function useCreateArReceiptMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: (body: CreateArReceiptBody) => createArReceipt(getAccessToken(), body),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("บันทึกรับชำระสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("บันทึกรับชำระไม่สำเร็จ")),
  });
}

export function useCancelArReceiptMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelArReceipt(getAccessToken(), id, reason),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ยกเลิกใบรับชำระสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("ยกเลิกใบรับชำระไม่สำเร็จ")),
  });
}

export function useCreditLedgerQuery(customerId?: string) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "ledger", customerId],
    queryFn: async () => (await getCreditLedger(getAccessToken(), customerId as string)).data,
    enabled: Boolean(customerId),
  });
}

/** สถานะมัดจำของ SO — เตือนอย่างเดียว ผู้ใช้ที่ไม่มีสิทธิ์ (403) ไม่ต้องเห็น error */
export function useDepositStatusQuery(salesOrderId?: string) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "deposit-status", salesOrderId],
    queryFn: async () => (await getDepositStatus(getAccessToken(), salesOrderId as string)).data,
    enabled: Boolean(salesOrderId),
    retry: false,
  });
}

export function useApplyCreditMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: (body: ApplyCreditBody) => applyCredit(getAccessToken(), body),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ใช้เครดิตหักยอดสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("ใช้เครดิตหักยอดไม่สำเร็จ")),
  });
}

export function useArRefundsQuery(params: { keyword?: string; status?: string; customerId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "refunds", params],
    queryFn: async () => (await getArRefunds(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useCreateArRefundMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: (body: CreateArRefundBody) => createArRefund(getAccessToken(), body),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("บันทึกคืนเงินสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("บันทึกคืนเงินไม่สำเร็จ")),
  });
}

export function useCancelArRefundMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelArRefund(getAccessToken(), id, reason),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ยกเลิกใบคืนเงินสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("ยกเลิกใบคืนเงินไม่สำเร็จ")),
  });
}

/** สถานะการเงินของ SO (derived) — ผู้ใช้ที่ไม่มีสิทธิ์ (403) ไม่ต้องเห็น error */
export function useSalesOrderFinanceQuery(salesOrderId?: string) {
  return useQuery({
    queryKey: [...arReceiptsQueryKey, "so-finance", salesOrderId],
    queryFn: async () => (await getSalesOrderFinance(getAccessToken(), salesOrderId as string)).data,
    enabled: Boolean(salesOrderId),
    retry: false,
  });
}
