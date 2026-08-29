"use client";

import { useMemo } from "react";

import {
  buildConversionIndex,
  EMPTY_CONVERSION_INDEX,
  type ConversionIndex,
} from "@/lib/units/conversion";
import { useUnitConversionsQuery } from "./useUnitConversionsQuery";

/**
 * hook เดียวที่ทุกฟอร์มเรียกเพื่อใช้กฎแปลงหน่วย
 * ดึงกฎที่เปิดใช้งานทั้งหมดครั้งเดียว (cache 5 นาที) แล้วประกอบเป็น index สำหรับ preview สด
 */
export function useUnitConversionIndex(): {
  index: ConversionIndex;
  isLoading: boolean;
} {
  const query = useUnitConversionsQuery({ isActive: true });

  const index = useMemo(
    () =>
      query.data?.data
        ? buildConversionIndex(query.data.data)
        : EMPTY_CONVERSION_INDEX,
    [query.data],
  );

  return { index, isLoading: query.isLoading };
}
