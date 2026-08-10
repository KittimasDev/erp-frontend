"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getStockPostingApproval,
  getStockPostingApprovals,
  getStockPostingRequestByReceipt,
} from "@/lib/api/stock-posting-requests";
import {
  canAccessScreen,
  hasPermission,
  isMatrixPermissionMode,
} from "@/lib/auth/permissions-access";
import { RoleCode } from "@/lib/auth/role-codes";
import { isAdministrator, userHasRole } from "@/lib/auth/session";
import { getAccessToken, hasAccessToken } from "@/lib/auth/token";
import { StockPostingRequestStatus } from "@/types/stock-posting-request";

export const stockPostingRequestsQueryKey = [
  "warehouse",
  "stock-posting-requests",
] as const;

export const pendingStockPostingApprovalsCountQueryKey = [
  ...stockPostingRequestsQueryKey,
  "approvals",
  StockPostingRequestStatus.PENDING_APPROVAL,
] as const;

const COUNT_POLL_MS = 30_000;

function countPollInterval(query: { state: { status: string } }): number | false {
  if (query.state.status === "error") {
    return false;
  }
  return COUNT_POLL_MS;
}

/** สิทธิ์เข้าหน้ารายการอนุมัติรับยางเข้าคลัง (เมนู / badge) — ตรงกับ canSeeMenu */
export function canAccessStockPostingApprovals(): boolean {
  if (isAdministrator()) {
    return true;
  }
  if (isMatrixPermissionMode()) {
    return (
      canAccessScreen("STOCK_POSTING_APPROVALS") ||
      hasPermission(
        "STOCK_POSTING_APPROVALS.VIEW",
        "STOCK_POSTING_APPROVALS.APPROVE",
      )
    );
  }
  return (
    userHasRole(RoleCode.WAREHOUSE_MANAGER) ||
    userHasRole(RoleCode.EXECUTIVE)
  );
}

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
    queryKey: [
      ...stockPostingRequestsQueryKey,
      "approvals",
      status ?? "PENDING_APPROVAL",
    ],
    queryFn: () => getStockPostingApprovals(getAccessToken(), status),
  });
}

/** จำนวนคำขอรับยางเข้าคลังรออนุมัติ สำหรับ badge (เมนู / หน้าแรก) */
export function usePendingStockPostingApprovalsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: pendingStockPostingApprovalsCountQueryKey,
    queryFn: () =>
      getStockPostingApprovals(
        getAccessToken(),
        StockPostingRequestStatus.PENDING_APPROVAL,
      ),
    enabled: (options?.enabled ?? true) && hasAccessToken(),
    refetchInterval: countPollInterval,
    refetchOnMount: true,
    refetchOnWindowFocus: (query) => query.state.status !== "error",
    retry: 1,
    select: (res) => res?.data?.length ?? 0,
  });
}

export function useStockPostingApprovalQuery(id?: string) {
  return useQuery({
    queryKey: [...stockPostingRequestsQueryKey, "detail", id],
    queryFn: () => getStockPostingApproval(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
