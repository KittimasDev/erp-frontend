"use client";

import { useQuery } from "@tanstack/react-query";

import {
  checkStepSkip,
  getMaterialConversion,
  getMaterialConversions,
} from "@/lib/api/material-conversions";
import { getMaterialConversionRoutes } from "@/lib/api/material-conversion-routes";
import { getAccessToken } from "@/lib/auth/token";
import type { QueryMaterialConversionsParams } from "@/types/material-conversion";

export const materialConversionsKey = ["material-conversions"] as const;
export const materialConversionRoutesKey = [
  "material-conversion-routes",
] as const;

export function useMaterialConversionsQuery(
  params?: QueryMaterialConversionsParams,
) {
  return useQuery({
    queryKey: [...materialConversionsKey, "list", params ?? {}],
    queryFn: () => getMaterialConversions(getAccessToken(), params),
  });
}

export function useMaterialConversionQuery(id?: string) {
  return useQuery({
    queryKey: [...materialConversionsKey, "detail", id],
    queryFn: () => getMaterialConversion(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

/** เส้นทางทั้งชุดพร้อมขั้นตอนและแม่แบบ — backend cache ไว้แล้ว ดึงทีเดียวจบ */
export function useMaterialConversionRoutesQuery(params?: {
  search?: string;
  isActive?: boolean;
}) {
  return useQuery({
    queryKey: [...materialConversionRoutesKey, "list", params ?? {}],
    queryFn: () => getMaterialConversionRoutes(getAccessToken(), params),
  });
}

/**
 * เตือนข้ามขั้นแบบสด ๆ ระหว่างกรอกฟอร์ม
 *
 * ไม่มี Batch = ไม่ยิง request เลย เพราะ backend จะคืนว่าไม่เตือนอยู่แล้ว
 * (ไม่มีประวัติให้เทียบ) — ยิงไปก็เสีย round trip เปล่า
 */
export function useStepSkipCheckQuery(params: {
  routeId?: string;
  stepId?: string;
  batchNo?: string;
}) {
  const enabled = Boolean(
    params.routeId && params.stepId && params.batchNo?.trim(),
  );
  return useQuery({
    queryKey: [...materialConversionsKey, "step-skip", params],
    queryFn: () =>
      checkStepSkip(getAccessToken(), {
        routeId: params.routeId as string,
        stepId: params.stepId as string,
        batchNo: params.batchNo,
      }),
    enabled,
  });
}
