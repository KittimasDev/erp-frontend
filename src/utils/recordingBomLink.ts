import type { ProductionRecordingConfig } from "@/types/production-formula";

export type BomInputItem = { itemId: string; label: string };

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
  const errors: string[] = [];
  if (missing.length)
    errors.push(`วัตถุดิบที่ยังไม่ได้ลิงก์กับช่องบันทึก Input: ${missing.join(", ")}`);
  if (noReason.length)
    errors.push(`ยกเว้นแล้วแต่ยังไม่ระบุเหตุผล: ${noReason.join(", ")}`);
  if (both.length)
    errors.push(`ทั้งยกเว้นและลิงก์พร้อมกัน: ${both.join(", ")}`);
  return errors;
}
