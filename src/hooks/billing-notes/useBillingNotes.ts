"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { paymentVouchersKey } from "@/hooks/payment-vouchers/usePaymentVouchers";
import {
  cancelBillingNote,
  confirmBillingNote,
  createBillingNote,
  getBillingCreateInfo,
  getBillingNoteDetail,
  getBillingNotes,
  getPendingBillingAps,
  issueBillingNotePv,
  updateBillingNote,
} from "@/lib/api/billing-notes";
import { getAccessToken } from "@/lib/auth/token";
import type { BillingNoteQuery, PendingBillingApQuery, SaveBillingNoteBody } from "@/types/billing-notes";

export const billingNotesQueryKey = ["billing-notes"] as const;

/** ตารางรอวางบิล — query แยกจากตารางใบวางบิลที่สร้างแล้ว */
export function usePendingBillingApsQuery(params: PendingBillingApQuery, enabled = true) {
  return useQuery({
    queryKey: [...billingNotesQueryKey, "pending-aps", params],
    queryFn: async () => (await getPendingBillingAps(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useBillingNotesQuery(params: BillingNoteQuery) {
  return useQuery({
    queryKey: [...billingNotesQueryKey, "created", params],
    queryFn: async () => (await getBillingNotes(getAccessToken(), params)).data,
    placeholderData: keepPreviousData,
  });
}

export function useBillingCreateInfoQuery(apIds: string[]) {
  return useQuery({
    queryKey: [...billingNotesQueryKey, "create-info", apIds],
    queryFn: async () => (await getBillingCreateInfo(getAccessToken(), apIds)).data,
    enabled: apIds.length > 0,
    retry: false,
  });
}

export function useBillingNoteDetailQuery(id?: string) {
  return useQuery({
    queryKey: [...billingNotesQueryKey, "detail", id],
    queryFn: async () => (await getBillingNoteDetail(getAccessToken(), id as string)).data,
    enabled: Boolean(id),
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (alsoPv = false) => {
    void queryClient.invalidateQueries({ queryKey: billingNotesQueryKey });
    // ยอด AP ที่พร้อมวางบิลเปลี่ยน + คิว PV เปลี่ยน
    void queryClient.invalidateQueries({ queryKey: ["ap-documents"] });
    if (alsoPv) void queryClient.invalidateQueries({ queryKey: paymentVouchersKey });
  };
}

export function useSaveBillingNoteMutation(id?: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (body: SaveBillingNoteBody) =>
      (id ? await updateBillingNote(getAccessToken(), id, body) : await createBillingNote(getAccessToken(), body)).data,
    onSuccess: () => invalidate(),
  });
}

export function useConfirmBillingNoteMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => (await confirmBillingNote(getAccessToken(), id)).data,
    onSuccess: () => invalidate(),
  });
}

export function useCancelBillingNoteMutation(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (reason?: string) => (await cancelBillingNote(getAccessToken(), id, reason)).data,
    onSuccess: () => invalidate(true),
  });
}

export function useIssueBillingPvMutation(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (body: { amount: number; desiredPayDate?: string }) =>
      (await issueBillingNotePv(getAccessToken(), id, body)).data,
    onSuccess: () => invalidate(true),
  });
}
