"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveApDocument,
  cancelApDocument,
  createApDocument,
  getApDocument,
  getApDocuments,
  getApInvoiceOptions,
  getApPurchaseOrderOptions,
  updateApDocument,
} from "@/lib/api/ap-documents";
import { getAccessToken } from "@/lib/auth/token";
import type {
  ApDocumentKind,
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
