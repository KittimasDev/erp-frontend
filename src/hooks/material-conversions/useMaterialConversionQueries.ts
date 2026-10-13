"use client";

import { useQuery } from "@tanstack/react-query";

import {
  checkStepSkip,
  getChemicalUsage,
  getConversionLookups,
  getConversionScaleTickets,
  getRunDowntimes,
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

/** เครื่องจักร + พนักงาน สำหรับเลือกในฟอร์ม (M4.2) */
export function useConversionLookupsQuery() {
  return useQuery({
    queryKey: [...materialConversionsKey, "lookups"],
    queryFn: () => getConversionLookups(getAccessToken()),
    staleTime: 5 * 60 * 1000,
  });
}

/** ตั๋วชั่ง Floor Scale ที่ยังว่างให้ผูกน้ำหนัก (M4.3) */
export function useConversionScaleTicketsQuery(enabled = true) {
  return useQuery({
    queryKey: [...materialConversionsKey, "scale-tickets"],
    queryFn: () => getConversionScaleTickets(getAccessToken()),
    enabled,
  });
}

/** เครื่องหยุด (Downtime) ของใบ (M4.5) */
export function useRunDowntimesQuery(runId?: string, enabled = true) {
  return useQuery({
    queryKey: [...materialConversionsKey, "downtimes", runId],
    queryFn: () => getRunDowntimes(getAccessToken(), runId as string),
    enabled: enabled && Boolean(runId),
  });
}

/** สรุปสารเคมีที่ใช้ต่อใบ/ต่อ Batch (M7.4) */
export function useChemicalUsageQuery(
  params: { runId?: string; batchNo?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: [...materialConversionsKey, "chemical-usage", params],
    queryFn: () => getChemicalUsage(getAccessToken(), params),
    enabled: enabled && Boolean(params.runId || params.batchNo?.trim()),
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
