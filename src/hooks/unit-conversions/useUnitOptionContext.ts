"use client";

import { useMemo } from "react";

import { useUnitsQuery } from "@/hooks/units/useUnitsQuery";
import type { UnitOptionContext } from "@/lib/units/unitSelectOptions";
import type { Unit } from "@/types/units";
import { useUnitConversionIndex } from "./useUnitConversionIndex";

const EMPTY_UNITS: Unit[] = [];

/**
 * ก้อนข้อมูลร่วมสำหรับสร้าง dropdown หน่วยนับ — เรียกครั้งเดียวต่อหน้า แล้วส่งต่อทุกบรรทัด
 *
 * ต้องใช้ params { isActive: true } ให้ตรงกับที่หน้าอื่นเรียก ไม่งั้น TanStack Query
 * จะมองเป็นคนละ queryKey แล้วยิงซ้ำ
 */
export function useUnitOptionContext(): UnitOptionContext & {
  isLoading: boolean;
} {
  const { index, isLoading: indexLoading } = useUnitConversionIndex();
  const unitsQuery = useUnitsQuery({ isActive: true });

  const units = unitsQuery.data?.data ?? EMPTY_UNITS;

  return useMemo(
    () => ({
      index,
      units,
      unitById: new Map(units.map((unit) => [unit.id, unit])),
      isLoading: indexLoading || unitsQuery.isLoading,
    }),
    [index, units, indexLoading, unitsQuery.isLoading],
  );
}
