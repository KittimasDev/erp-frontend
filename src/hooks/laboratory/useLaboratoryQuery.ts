"use client";

import { useQuery } from "@tanstack/react-query";

import { canAccessBadgeScreen } from "@/hooks/badges/badge-access";
import {
  getLabSample,
  getLabSampleCoa,
  getLabSampleQrCode,
  getLabSamples,
} from "@/lib/api/laboratory";
import {
  pendingCountQueryOptions,
  selectDataLength,
} from "@/lib/query/count-query";
import { getAccessToken } from "@/lib/auth/token";
import type { LabSampleQueryParams } from "@/types/laboratory";

export const laboratoryQueryKey = ["laboratory-samples"] as const;

export function useLabSamplesQuery(params?: LabSampleQueryParams) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "list", params ?? {}],
    queryFn: () => getLabSamples(getAccessToken(), params),
  });
}

export function useLabSampleQuery(id?: string) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "detail", id],
    queryFn: () => getLabSample(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

export function useLabSampleCoaQuery(id?: string, enabled = false) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "coa", id],
    queryFn: () => getLabSampleCoa(getAccessToken(), id as string),
    enabled: Boolean(id) && enabled,
  });
}

export function useLabSampleQrCodeQuery(id?: string, enabled = false) {
  return useQuery({
    queryKey: [...laboratoryQueryKey, "qrcode", id],
    queryFn: () => getLabSampleQrCode(getAccessToken(), id as string),
    enabled: Boolean(id) && enabled,
  });
}

/**
 * คิวผลตรวจ LAB ที่รออนุมัติ สำหรับ badge (เมนู / หน้าแรก)
 *
 * `TESTING` = บันทึกผลตรวจแล้ว รอหัวหน้าแล็บอนุมัติก่อนออก COA
 *
 * endpoint นี้ยังไม่มี pagination จึงต้องดึงทั้งชุดมานับ (`selectDataLength`)
 * ปริมาณตัวอย่างต่อช่วงยังน้อยจึงรับได้ — ถ้าโตขึ้นให้เพิ่ม page/limit + total
 * ฝั่ง backend แล้วเปลี่ยนมาใช้ `selectListTotal` เหมือนโมดูลอื่น
 */
export const pendingLabReviewsCountQueryKey = [
  ...laboratoryQueryKey,
  "pending-review",
  "count",
] as const;

export function pendingLabReviewsCountOptions(ctx?: { enabled?: boolean }) {
  return pendingCountQueryOptions({
    queryKey: pendingLabReviewsCountQueryKey,
    queryFn: () => getLabSamples(getAccessToken(), { status: "TESTING" }),
    select: selectDataLength,
    canAccess: () => canAccessBadgeScreen("LAB_SAMPLES"),
    enabled: ctx?.enabled,
  });
}
