"use client";

import { useMemo } from "react";

import {
  buildUnitSelectOptions,
  type UnitFieldState,
} from "@/lib/units/unitSelectOptions";
import type { Item } from "@/types/items";
import type { Unit } from "@/types/units";
import { useUnitOptionContext } from "./useUnitOptionContext";

/**
 * ตัวช่วยสำหรับฟอร์มที่ใช้ Form.List — เรียกครั้งเดียวที่ระดับหน้า
 * แล้วเรียก resolveUnitField(itemId, currentUnitId) ต่อบรรทัดได้เลย
 *
 * @param items รายการสินค้าที่หน้านั้นโหลดมา ใช้หาหน่วยหลักของแต่ละบรรทัด
 * @param allowConvertible เปิดเฉพาะโดเมนที่ backend แปลงหน่วยได้จริง (ดู unitSelectOptions.tsx)
 */
export function useUnitFieldResolver(
  items: Item[],
  allowConvertible = false,
): {
  resolveUnitField: (itemId?: string, currentUnitId?: string) => UnitFieldState;
  units: Unit[];
  isLoading: boolean;
} {
  const ctx = useUnitOptionContext();

  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );

  const resolveUnitField = useMemo(
    () =>
      // ไม่ทำ memo cache ต่อคีย์ — repo ห้าม mutate ตัวแปรที่ capture ไว้หลัง render
      // (react-hooks/immutability) และตัว build เองก็แค่ lookup Map + สร้าง 1-2 option
      (itemId?: string, currentUnitId?: string): UnitFieldState =>
        buildUnitSelectOptions(ctx, {
          itemId,
          baseUnitId: itemId ? itemById.get(itemId)?.unitId : undefined,
          currentUnitId,
          allowConvertible,
        }),
    [ctx, itemById, allowConvertible],
  );

  return { resolveUnitField, units: ctx.units, isLoading: ctx.isLoading };
}
