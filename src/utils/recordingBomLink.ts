import type { ProductionRecordingConfig } from "@/types/production-formula";

export type BomInputItem = { itemId: string; label: string };

/** ฟิลด์นี้ตัด Stock ตอน Confirm กะหรือไม่ — ไม่ระบุคีย์ = ตัด (ตามพฤติกรรมเดิม) */
export const fieldDeductsStock = (f: { stockDeduct?: boolean }) => f.stockDeduct !== false;

/** กันตัด Stock ซ้ำ — mirror ของ backend `validateStockDeductPoints` (backend เป็นตัวตัดสิน) */
export function validateStockDeductPoints(
  config: ProductionRecordingConfig,
  labelOf: (itemId: string) => string = (id) => id,
): string[] {
  const byItem = new Map<string, ProductionRecordingConfig["fields"]>();
  for (const f of config.fields) {
    if (f.resultRole !== "INPUT" || !f.linkedItemId) continue;
    byItem.set(f.linkedItemId, [...(byItem.get(f.linkedItemId) ?? []), f]);
  }
  const errors: string[] = [];
  for (const [itemId, fields] of byItem) {
    if (fields.length < 2) continue;
    if (!fields.some((f) => typeof f.stockDeduct === "boolean")) continue;
    const deducting = fields.filter(fieldDeductsStock);
    if (deducting.length > 1) {
      errors.push(
        `วัตถุดิบ ${labelOf(itemId)} ถูกกำหนดให้ตัด Stock ซ้ำ ${deducting.length} ช่อง (${deducting
          .map((f) => f.label || f.code)
          .join(", ")}) — เลือกตัดได้เพียง 1 ช่อง`,
      );
    }
  }
  return errors;
}

/** ตรวจลิงก์ BOM ↔ ช่อง Input (ฝั่ง backend ตรวจซ้ำและเป็นตัวตัดสิน) — คืนข้อความผิดพลาด ว่าง = ผ่าน */
export function validateRecordingBomLinks(
  config: ProductionRecordingConfig,
  inputs: BomInputItem[],
): string[] {
  const linked = new Set(
    config.fields.flatMap((f) =>
      f.resultRole === "INPUT" && f.linkedItemId ? [f.linkedItemId] : [],
    ),
  );
  const ex = new Map(
    (config.bomExemptions ?? []).map((e) => [e.itemId, e.reason] as const),
  );
  const missing: string[] = [];
  const noReason: string[] = [];
  const both: string[] = [];
  for (const i of inputs) {
    if (ex.has(i.itemId)) {
      if (linked.has(i.itemId)) both.push(i.label);
      else if (!(ex.get(i.itemId) ?? "").trim()) noReason.push(i.label);
    } else if (!linked.has(i.itemId)) {
      missing.push(i.label);
    }
  }
  const errors: string[] = validateStockDeductPoints(
    config,
    (id) => inputs.find((i) => i.itemId === id)?.label ?? id,
  );
  if (missing.length)
    errors.push(`วัตถุดิบที่ยังไม่ได้ลิงก์กับช่องบันทึก Input: ${missing.join(", ")}`);
  if (noReason.length)
    errors.push(`ยกเว้นแล้วแต่ยังไม่ระบุเหตุผล: ${noReason.join(", ")}`);
  if (both.length)
    errors.push(`ทั้งยกเว้นและลิงก์พร้อมกัน: ${both.join(", ")}`);
  return errors;
}
