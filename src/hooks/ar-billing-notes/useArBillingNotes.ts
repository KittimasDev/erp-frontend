"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";

import { ApiError } from "@/lib/api/client";
import {
  cancelArBillingNote,
  confirmArBillingNote,
  createArBillingNote,
  getArBillingNote,
  getArBillingNotes,
  getPendingArInvoices,
  updateArBillingNote,
} from "@/lib/api/ar-billing-notes";
import { getAccessToken } from "@/lib/auth/token";
import { isESignCancelled } from "@/lib/esign/esign-gate";
import { useT } from "@/lib/i18n/useT";
import type {
  ArBillingNoteQuery,
  PendingArInvoiceQuery,
  SaveArBillingNoteBody,
} from "@/types/ar-billing-notes";

export const arBillingNotesQueryKey = ["ar-billing-notes"] as const;

/** ตารางรอวางบิล — query แยกจากตารางใบวางบิลที่สร้างแล้ว */
export function usePendingArInvoicesQuery(params: PendingArInvoiceQuery, enabled = true) {
  return useQuery({
    queryKey: [...arBillingNotesQueryKey, "pending-invoices", params],
    queryFn: async () => (await getPendingArInvoices(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useArBillingNotesQuery(params: ArBillingNoteQuery) {
  return useQuery({
    queryKey: [...arBillingNotesQueryKey, "list", params],
    queryFn: async () => (await getArBillingNotes(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useArBillingNoteQuery(id?: string) {
  return useQuery({
    queryKey: [...arBillingNotesQueryKey, "detail", id],
    queryFn: async () => (await getArBillingNote(getAccessToken(), id as string)).data,
    enabled: Boolean(id),
  });
}

function useAfterMutation() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return {
    invalidate: () => queryClient.invalidateQueries({ queryKey: arBillingNotesQueryKey }),
    fail: (error: unknown, fallback: string) =>
      message.error(error instanceof ApiError ? error.message : fallback),
    ok: (text: string) => message.success(text),
  };
}

export function useCreateArBillingNoteMutation() {
  const after = useAfterMutation();
  const t = useT();
  return useMutation({
    mutationFn: (body: SaveArBillingNoteBody) => createArBillingNote(getAccessToken(), body),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("สร้างใบวางบิลสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("สร้างใบวางบิลไม่สำเร็จ")),
  });
}

export function useUpdateArBillingNoteMutation() {
  const after = useAfterMutation();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SaveArBillingNoteBody }) =>
      updateArBillingNote(getAccessToken(), id, body),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("แก้ไขใบวางบิลสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("แก้ไขใบวางบิลไม่สำเร็จ")),
  });
}

export function useConfirmArBillingNoteMutation() {
  const after = useAfterMutation();
  const t = useT();
  return useMutation({
    mutationFn: (id: string) => confirmArBillingNote(getAccessToken(), id),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ยืนยันใบวางบิลสำเร็จ"));
    },
    // ผู้ใช้กดยกเลิกการยืนยันตัวตน (E-Sign) ไม่ต้องแจ้ง error
    onError: (e) => {
      if (!isESignCancelled(e)) after.fail(e, t("ยืนยันใบวางบิลไม่สำเร็จ"));
    },
  });
}

export function useCancelArBillingNoteMutation() {
  const after = useAfterMutation();
  const t = useT();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelArBillingNote(getAccessToken(), id, reason),
    onSuccess: async (res) => {
      await after.invalidate();
      after.ok(res.message || t("ยกเลิกใบวางบิลสำเร็จ"));
    },
    onError: (e) => after.fail(e, t("ยกเลิกใบวางบิลไม่สำเร็จ")),
  });
}
