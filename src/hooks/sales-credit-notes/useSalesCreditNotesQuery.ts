"use client";

import { useQuery } from "@tanstack/react-query";

import { getDocumentAttachments } from "@/lib/api/document-attachments";
import {
  getPendingSalesCreditNotes,
  getSalesCreditNote,
  getSalesCreditNotes,
} from "@/lib/api/sales-credit-notes";
import { getAccessToken } from "@/lib/auth/token";
import { DOCUMENT_TYPE_SALES_CREDIT_NOTE } from "@/types/document-attachments";

export const salesCreditNotesQueryKey = ["sales-credit-notes"] as const;

export function usePendingSalesCreditNotesQuery() {
  return useQuery({
    queryKey: [...salesCreditNotesQueryKey, "pending"],
    queryFn: async () => {
      const res = await getPendingSalesCreditNotes(getAccessToken());
      return res.data;
    },
  });
}

export function useSalesCreditNotesQuery(params: {
  page: number;
  limit: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: [...salesCreditNotesQueryKey, "list", params],
    queryFn: async () => {
      const res = await getSalesCreditNotes(getAccessToken(), params);
      return res.data;
    },
  });
}

export function useSalesCreditNoteQuery(id: string) {
  return useQuery({
    queryKey: [...salesCreditNotesQueryKey, "detail", id],
    queryFn: async () => {
      const res = await getSalesCreditNote(getAccessToken(), id);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useSalesCreditNoteAttachmentsQuery(id: string) {
  return useQuery({
    queryKey: [...salesCreditNotesQueryKey, "attachments", id],
    queryFn: async () => {
      const res = await getDocumentAttachments(getAccessToken(), {
        documentType: DOCUMENT_TYPE_SALES_CREDIT_NOTE,
        documentId: id,
      });
      return res.data;
    },
    enabled: Boolean(id),
  });
}
