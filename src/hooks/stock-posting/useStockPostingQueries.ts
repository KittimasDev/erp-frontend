"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getStockPostingApproval,
  getStockPostingApprovals,
  getStockPostingRequestByReceipt,
} from "@/lib/api/stock-posting-requests";
import { getAccessToken } from "@/lib/auth/token";

export const stockPostingRequestsQueryKey = [
  "warehouse",
  "stock-posting-requests",
] as const;

export function useStockPostingRequestByReceiptQuery(receiptId?: string) {
  return useQuery({
    queryKey: [...stockPostingRequestsQueryKey, "by-receipt", receiptId],
    queryFn: () =>
      getStockPostingRequestByReceipt(getAccessToken(), receiptId as string),
    enabled: Boolean(receiptId),
  });
}

export function useStockPostingApprovalsQuery(status?: string) {
  return useQuery({
    queryKey: [...stockPostingRequestsQueryKey, "approvals", status ?? "PENDING_APPROVAL"],
    queryFn: () => getStockPostingApprovals(getAccessToken(), status),
  });
}

export function useStockPostingApprovalQuery(id?: string) {
  return useQuery({
    queryKey: [...stockPostingRequestsQueryKey, "detail", id],
    queryFn: () => getStockPostingApproval(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
