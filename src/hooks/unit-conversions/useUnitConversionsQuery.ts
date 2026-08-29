"use client";

import { useQuery } from "@tanstack/react-query";

import { getUnitConversions } from "@/lib/api/unit-conversions";
import { getAccessToken } from "@/lib/auth/token";
import type { UnitConversionQueryParams } from "@/types/unit-conversions";

export const unitConversionsQueryKey = [
  "master-data",
  "unit-conversions",
] as const;

export function useUnitConversionsQuery(params?: UnitConversionQueryParams) {
  return useQuery({
    queryKey: [...unitConversionsQueryKey, params ?? {}],
    queryFn: () => getUnitConversions(getAccessToken(), params),
    // master data ที่แก้นานๆ ครั้ง แต่ถูกเรียกจากทุกฟอร์มที่มีช่องจำนวน
    staleTime: 5 * 60_000,
  });
}
