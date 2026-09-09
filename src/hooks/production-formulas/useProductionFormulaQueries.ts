"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getProductionFormula,
  getProductionFormulas,
  scaleProductionFormula,
} from "@/lib/api/production-formulas";
import { getAccessToken } from "@/lib/auth/token";
import type { QueryProductionFormulasParams } from "@/types/production-formula";

export const productionFormulasKey = [
  "master-data",
  "production-formulas",
] as const;

export function useProductionFormulasQuery(
  params?: QueryProductionFormulasParams,
) {
  return useQuery({
    queryKey: [...productionFormulasKey, "list", params ?? {}],
    queryFn: () => getProductionFormulas(getAccessToken(), params),
  });
}

export function useProductionFormulaQuery(id?: string) {
  return useQuery({
    queryKey: [...productionFormulasKey, "detail", id],
    queryFn: () => getProductionFormula(getAccessToken(), id as string),
    enabled: Boolean(id),
  });
}

/**
 * คิดประมาณการจากสูตร — ยิง backend ทุกครั้งที่เปลี่ยนตัวตั้งหรือจำนวน
 *
 * ผลลัพธ์ถูก cache ตาม (สูตร, บรรทัดตัวตั้ง, จำนวน) ดังนั้นพิมพ์กลับไปค่าเดิม
 * จะได้คำตอบทันทีจาก cache ไม่ยิงซ้ำ · เก็บผลเดิมไว้แสดงระหว่างโหลดค่าใหม่
 * (`placeholderData`) เพื่อไม่ให้ตารางกระพริบเป็นค่าว่างตอนพิมพ์
 */
export function useProductionFormulaScaleQuery(params: {
  formulaId?: string;
  driverLineId?: string;
  targetQty?: number | null;
}) {
  const enabled = Boolean(
    params.formulaId &&
      params.driverLineId &&
      params.targetQty !== null &&
      params.targetQty !== undefined &&
      params.targetQty > 0,
  );
  return useQuery({
    queryKey: [
      ...productionFormulasKey,
      "scale",
      params.formulaId,
      params.driverLineId,
      params.targetQty,
    ],
    queryFn: () =>
      scaleProductionFormula(getAccessToken(), params.formulaId as string, {
        driverLineId: params.driverLineId as string,
        targetQty: params.targetQty as number,
      }),
    enabled,
    placeholderData: (previous) => previous,
  });
}
