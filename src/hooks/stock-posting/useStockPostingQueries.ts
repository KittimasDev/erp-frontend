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
import {
  pendingCountQueryOptions,
  selectDataLength,
} from "@/lib/query/count-query";
import { StockPostingRequestStatus } from "@/types/stock-posting-request";

export const stockPostingRequestsQueryKey = [
  "warehouse",
  "stock-posting-requests",
] as const;

/**
 * key ของ badge — เดิมตรงเป๊ะกับ key ของ useStockPostingApprovalsQuery()
 * ทำให้เป็น cache entry เดียวกันแต่ options ต่างกัน ต่อท้าย "count" แยกออกมา
 */
export const pendingStockPostingApprovalsCountQueryKey = [
  ...stockPostingRequestsQueryKey,
  "approvals",
  StockPostingRequestStatus.PENDING_APPROVAL,
  "count",
] as const;

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
export function pendingStockPostingApprovalsCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingStockPostingApprovalsCountQueryKey,
    queryFn: () =>
      getStockPostingApprovals(
        getAccessToken(),
        StockPostingRequestStatus.PENDING_APPROVAL,
      ),
    select: selectDataLength,
    canAccess: canAccessStockPostingApprovals,
    enabled: ctx?.enabled,
  });
}

export function usePendingStockPostingApprovalsCountQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery(pendingStockPostingApprovalsCountOptions(options));
}

export function useStockPostingApprovalQuery(id?: string) {
  return useQuery({
    queryKey: [...stockPostingRequestsQueryKey, "detail", id],
    queryFn: () => getStockPostingApproval(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}
