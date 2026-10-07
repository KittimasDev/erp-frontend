"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { uploadDocumentAttachment } from "@/lib/api/document-attachments";
import {
  approveSalesCreditNote,
  cancelSalesCreditNote,
  confirmSalesCreditNote,
  createSalesCreditNote,
  updateSalesCreditNote,
} from "@/lib/api/sales-credit-notes";
import { getAccessToken } from "@/lib/auth/token";
import { DOCUMENT_TYPE_SALES_CREDIT_NOTE } from "@/types/document-attachments";
import type { SaveSalesCreditNoteBody } from "@/types/sales-credit-notes";
import { salesCreditNotesQueryKey } from "./useSalesCreditNotesQuery";

export function useCreateSalesCreditNoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveSalesCreditNoteBody) =>
      createSalesCreditNote(getAccessToken(), body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesCreditNotesQueryKey });
    },
  });
}

export function useUpdateSalesCreditNoteMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveSalesCreditNoteBody) =>
      updateSalesCreditNote(getAccessToken(), id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesCreditNotesQueryKey });
    },
  });
}

export function useConfirmSalesCreditNoteMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => confirmSalesCreditNote(getAccessToken(), id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesCreditNotesQueryKey });
    },
  });
}

export function useApproveSalesCreditNoteMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => approveSalesCreditNote(getAccessToken(), id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesCreditNotesQueryKey });
    },
  });
}

export function useCancelSalesCreditNoteMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelSalesCreditNote(getAccessToken(), id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: salesCreditNotesQueryKey });
    },
  });
}

export function useUploadSalesCreditNoteAttachmentMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      uploadDocumentAttachment(getAccessToken(), {
        file,
        documentType: DOCUMENT_TYPE_SALES_CREDIT_NOTE,
        documentId: id,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...salesCreditNotesQueryKey, "attachments", id],
      });
    },
  });
}
