"use client";

import { useQuery } from "@tanstack/react-query";

import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import { getStockIssue, getStockIssues } from "@/lib/api/stock-issues";
import {
  pendingCountQueryOptions,
  selectListTotal,
} from "@/lib/query/count-query";
import { getAccessToken } from "@/lib/auth/token";
import type { StockIssueQueryParams } from "@/types/stock-issues";

export const stockIssuesQueryKey = ["stock-issues"] as const;

export function useStockIssuesQuery(params?: StockIssueQueryParams) {
  return useQuery({
    queryKey: [...stockIssuesQueryKey, "list", params ?? {}],
    queryFn: () => getStockIssues(getAccessToken(), params),
  });
}

export function useStockIssueQuery(id?: string) {
  return useQuery({
    queryKey: [...stockIssuesQueryKey, "detail", id],
    queryFn: () => getStockIssue(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

/** คิวใบเบิกของออกจากคลังที่รออนุมัติ สำหรับ badge (เมนู / หน้าแรก) */
export const pendingStockIssuesCountQueryKey = [
  ...stockIssuesQueryKey,
  "pending",
  "count",
] as const;

/*
  ใบกลุ่มนี้ไม่มีขั้น "ส่งอนุมัติ" แยก — DRAFT คือรออนุมัติอยู่แล้ว
  อนุมัติ = ตัดสต๊อกจริง จึงเป็นคิวที่ต้องมีคนมาเคลียร์
*/
export function pendingStockIssuesCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingStockIssuesCountQueryKey,
    // limit=1 พอ เพราะอ่านแค่ total ที่ backend นับมาให้
    queryFn: () =>
      getStockIssues(getAccessToken(), { status: "DRAFT", page: 1, limit: 1 }),
    select: selectListTotal,
    canAccess: () => canAccessBadgeScreen("INVENTORY_ISSUES"),
    enabled: ctx?.enabled,
  });
}
