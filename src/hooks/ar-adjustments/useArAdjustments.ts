"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelArDebitNote,
  cancelCreditNoteSettlement,
  confirmArDebitNote,
  createArDebitNote,
  getArDebitNote,
  getArDebitNotes,
  getCreditNoteSettlements,
  settleCreditNote,
  updateArDebitNote,
} from "@/lib/api/ar-adjustments";
import { getAccessToken } from "@/lib/auth/token";
import { isESignCancelled } from "@/lib/esign/esign-gate";
import { useT } from "@/lib/i18n/useT";
import { arReceiptsQueryKey } from "@/hooks/ar-receipts/useArReceipts";
import { arBillingNotesQueryKey } from "@/hooks/ar-billing-notes/useArBillingNotes";
import { salesInvoicesQueryKey } from "@/hooks/sales-invoices/useSalesInvoicesQuery";
import type { ArDebitNoteQuery, SaveArDebitNoteBody, SettleCreditNoteBody } from "@/types/ar-adjustments";

export const arAdjustmentsQueryKey = ["ar-adjustments"] as const;

export function useCreditNoteSettlementsQuery(creditNoteId?: string) {
  return useQuery({
    queryKey: [...arAdjustmentsQueryKey, "settlements", creditNoteId],
    queryFn: async () => (await getCreditNoteSettlements(getAccessToken(), creditNoteId as string)).data,
    enabled: Boolean(creditNoteId),
    retry: false,
  });
}

export function useArDebitNotesQuery(params: ArDebitNoteQuery) {
  return useQuery({
    queryKey: [...arAdjustmentsQueryKey, "debit-list", params],
    queryFn: async () => (await getArDebitNotes(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useArDebitNoteQuery(id?: string) {
  return useQuery({
    queryKey: [...arAdjustmentsQueryKey, "debit-detail", id],
    queryFn: async () => (await getArDebitNote(getAccessToken(), id as string)).data,
    enabled: Boolean(id),
  });
}

function useAfter() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return {
    // ตัดยอด/เพิ่มหนี้กระทบยอดค้างของ AR เครดิตลูกค้า และรายการรอวางบิล
    invalidate: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: arAdjustmentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: arReceiptsQueryKey }),
        queryClient.invalidateQueries({ queryKey: arBillingNotesQueryKey }),
        queryClient.invalidateQueries({ queryKey: salesInvoicesQueryKey }),
      ]),
    fail: (e: unknown, fallback: string) => message.error(e instanceof ApiError ? e.message : fallback),
    ok: (text: string) => message.success(text),
  };
}

export function useSettleCreditNoteMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SettleCreditNoteBody }) =>
      settleCreditNote(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ตัดยอดใบลดหนี้สำเร็จ"));
    },
    onError: (e) => after.fail(e, t("ตัดยอดใบลดหนี้ไม่สำเร็จ")),
  });
}

export function useCancelSettlementMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelCreditNoteSettlement(getAccessToken(), id, reason),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ยกเลิกการตัดยอดสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("ยกเลิกการตัดยอดไม่สำเร็จ")),
  });
}

export function useCreateArDebitNoteMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: (body: SaveArDebitNoteBody) => createArDebitNote(getAccessToken(), body),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("สร้างใบเพิ่มหนี้สำเร็จ"));
    },
    onError: (e) => after.fail(e, t("สร้างใบเพิ่มหนี้ไม่สำเร็จ")),
  });
}

export function useUpdateArDebitNoteMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SaveArDebitNoteBody }) =>
      updateArDebitNote(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("แก้ไขใบเพิ่มหนี้สำเร็จ"));
    },
    onError: (e) => after.fail(e, t("แก้ไขใบเพิ่มหนี้ไม่สำเร็จ")),
  });
}

export function useConfirmArDebitNoteMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: (id: string) => confirmArDebitNote(getAccessToken(), id),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ยืนยันใบเพิ่มหนี้สำเร็จ"));
    },
    // ผู้ใช้กดยกเลิกการยืนยันตัวตน (E-Sign) ไม่ต้องแจ้ง error
    onError: (e) => {
      if (!isESignCancelled(e)) after.fail(e, t("ยืนยันใบเพิ่มหนี้ไม่สำเร็จ"));
    },
  });
}

export function useCancelArDebitNoteMutation() {
  const after = useAfter();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelArDebitNote(getAccessToken(), id, reason),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ยกเลิกใบเพิ่มหนี้สำเร็จ"));
    },
    onError: (e) => after.fail(e, t("ยกเลิกใบเพิ่มหนี้ไม่สำเร็จ")),
  });
}
