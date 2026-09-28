/**
 * โดเมนไหน "backend แปลงหน่วยจริงแล้ว"
 *
 * ต้องตรงกับฝั่ง backend เป๊ะ — โดเมนที่ยังเรียก `assertLinesUseBaseUnit()`
 * (backend/src/common/units/base-unit.guard.ts) จะปฏิเสธหน่วยอื่นด้วย 400
 * ส่วนโดเมนที่ย้ายไปใช้ `resolveLinesToBase()` แล้วจะแปลงให้จริง
 *
 * **เพิ่มชื่อที่นี่ได้ก็ต่อเมื่อ service ตัวนั้น**
 *   1. ถอด assertLinesUseBaseUnit ออกแล้ว
 *   2. เรียก resolveLinesToBase ก่อนเช็คยอดคงเหลือ
 *   3. เก็บ entered_* / base_* / conversion_factor ลงตารางบรรทัด
 *
 * เปิดที่นี่ทั้งที่ backend ยังไม่ทำ = ผู้ใช้เลือกหน่วยได้แล้วโดน 400 ตอนกดบันทึก
 * ซึ่งแย่กว่าไม่ให้เลือกตั้งแต่แรก
 */
export type UnitConversionDomain =
  | "GOODS_RECEIPTS"
  | "STOCK_ISSUES"
  | "STOCK_TRANSFERS"
  | "CHEMICAL_ISSUES"
  | "STOCK_ADJUSTMENTS"
  | "PHYSICAL_INVENTORY_COUNTS"
  | "PRODUCTION_ORDERS"
  | "PRODUCTION_OUTPUT_STOCK_REQUESTS"
  | "MATERIAL_CONVERSIONS"
  | "PURCHASE_REQUESTS"
  | "SALES_QUOTATIONS"
  | "SALES_ORDERS";

export const UNIT_CONVERTING_DOMAINS: ReadonlySet<UnitConversionDomain> =
  new Set<UnitConversionDomain>([
    "GOODS_RECEIPTS",
    "STOCK_ISSUES",
    "STOCK_TRANSFERS",
    "CHEMICAL_ISSUES",
    "STOCK_ADJUSTMENTS",
    "PHYSICAL_INVENTORY_COUNTS",
    "PRODUCTION_ORDERS",
    "PRODUCTION_OUTPUT_STOCK_REQUESTS",
    "MATERIAL_CONVERSIONS",
    "PURCHASE_REQUESTS",
    "SALES_QUOTATIONS",
    "SALES_ORDERS",
  ]);

/**
 * สูตรระดับแม่ — map คือ *เพดาน* (backend ทำได้แค่ไหน) flag คือ *สวิตช์* (ops เปิดหรือยัง)
 * ต้อง AND กัน ไม่ใช่ OR
 */
export function domainConvertsUnits(
  domain: UnitConversionDomain,
  featureEnabled: boolean | undefined,
): boolean {
  // ไม่รู้ = ปิด ห้าม fail-open
  return (featureEnabled ?? false) && UNIT_CONVERTING_DOMAINS.has(domain);
}
