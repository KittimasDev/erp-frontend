"use client";

import { useQuery } from "@tanstack/react-query";

import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import {
  getMyOvertimeRequests,
  getOvertimeRequests,
  getOvertimeSummary,
} from "@/lib/api/overtime";
import { pendingCountQueryOptions } from "@/lib/query/count-query";
import { getAccessToken } from "@/lib/auth/token";
import type {
  OvertimeQueryParams,
  OvertimeSummaryParams,
} from "@/types/overtime";

export const myOvertimeQueryKey = (limit: number) =>
  ["overtime", "me", limit] as const;

export function useMyOvertimeRequestsQuery(limit = 30, enabled = true) {
  return useQuery({
    queryKey: myOvertimeQueryKey(limit),
    queryFn: () => getMyOvertimeRequests(getAccessToken(), limit),
    enabled,
    retry: false,
  });
}

export const overtimeRequestsQueryKey = (params: OvertimeQueryParams) =>
  ["overtime", "list", params] as const;

export function useOvertimeRequestsQuery(params: OvertimeQueryParams = {}) {
  return useQuery({
    queryKey: overtimeRequestsQueryKey(params),
    queryFn: () => getOvertimeRequests(getAccessToken(), params),
  });
}

export const overtimeSummaryQueryKey = (params: OvertimeSummaryParams) =>
  ["overtime", "summary", params] as const;

export function useOvertimeSummaryQuery(params: OvertimeSummaryParams = {}) {
  return useQuery({
    queryKey: overtimeSummaryQueryKey(params),
    queryFn: () => getOvertimeSummary(getAccessToken(), params),
  });
}

/**
 * คิวคำขอ OT ที่รออนุมัติ สำหรับ badge (เมนู / หน้าแรก)
 *
 * อ่านจาก `summary.pendingCount` ที่ backend นับมาให้แล้วและ **ไม่ผูกช่วงวันที่**
 * — ถูกกว่าดึงรายการทั้งหมดมานับ และตรงกับความหมายของ badge ที่ต้องเห็นคิวค้าง
 * ทั้งหมดไม่ใช่เฉพาะเดือนนี้
 */
export const pendingOvertimeApprovalsCountQueryKey = [
  "overtime",
  "pending-approvals",
  "count",
] as const;

export function pendingOvertimeApprovalsCountOptions(ctx?: {
  enabled?: boolean;
}) {
  return pendingCountQueryOptions({
    queryKey: pendingOvertimeApprovalsCountQueryKey,
    queryFn: () => getOvertimeSummary(getAccessToken(), {}),
    select: (res) => res?.data?.pendingCount ?? 0,
    canAccess: () => canAccessBadgeScreen("HRM_OVERTIME"),
    enabled: ctx?.enabled,
  });
}
