"use client";

import { useCallback } from "react";

import { useUnitOptionContext } from "@/hooks/unit-conversions/useUnitOptionContext";
import { fromBaseQty } from "@/lib/units/conversion";

export type EnteredUnitCeiling = {
  /** เพดานในหน่วยที่ผู้ใช้เลือก — undefined = ไม่มีเพดาน หรือแปลงไม่ได้ */
  max?: number;
  /** แปลงเพดานไม่ได้ (ไม่มีกฎ) — ต้องปฏิเสธตอน submit ไม่ใช่ clamp เป็น 0 */
  unconvertible: boolean;
};

/**
 * แปลง "เพดานจำนวน" ที่เป็นหน่วยฐาน ให้เป็นหน่วยที่ผู้ใช้กำลังกรอก
 *
 * ยอดคงเหลือของ Lot / ยอดคงเหลือตามแผน เก็บเป็นหน่วยฐานล้วน ถ้าเอาไปเทียบกับ
 * ตัวเลขที่ผู้ใช้กรอกในหน่วยอื่นตรง ๆ จะผิดแบบไม่มีใครรู้ — กรอก 1 ตัน เทียบกับ
 * คงเหลือ 500 กก. แล้วได้ว่า "1 ไม่เกิน 500" ผ่านฉลุย ไปโดนปฏิเสธเอาที่ backend
 *
 * แปลงไม่ได้ให้คืน `max: undefined` + `unconvertible: true` — **ห้าม clamp เป็น 0**
 * เพราะผู้ใช้จะพิมพ์อะไรไม่ได้เลยโดยไม่มีคำอธิบาย ให้ปล่อยพิมพ์แล้วตีตอน validate
 */
export function useEnteredUnitCeiling() {
  const ctx = useUnitOptionContext();

  return useCallback(
    (args: {
      itemId?: string;
      unitId?: string;
      baseUnitId?: string;
      baseCeiling?: number | null;
    }): EnteredUnitCeiling => {
      const { itemId, unitId, baseUnitId, baseCeiling } = args;
      if (baseCeiling == null || !Number.isFinite(Number(baseCeiling))) {
        return { max: undefined, unconvertible: false };
      }
      // กรอกด้วยหน่วยฐานอยู่แล้ว หรือข้อมูลไม่ครบ = ใช้ค่าเดิมตรง ๆ
      if (!itemId || !unitId || !baseUnitId || unitId === baseUnitId) {
        return { max: Number(baseCeiling), unconvertible: false };
      }
      const converted = fromBaseQty(ctx.index, {
        baseQty: baseCeiling,
        unitId,
        baseUnitId,
        itemId,
      });
      if (converted === null) {
        return { max: undefined, unconvertible: true };
      }
      return { max: converted, unconvertible: false };
    },
    [ctx.index],
  );
}
