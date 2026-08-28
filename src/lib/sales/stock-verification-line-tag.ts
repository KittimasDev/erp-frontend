import type { SalesOrderStockVerificationLine } from "@/types/sales-orders";

const QTY_EPSILON = 0.0005;

function toQty(value?: string | number): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export type StockVerificationLineTag = {
  color: "success" | "processing" | "error";
  label: "จ่ายแล้ว" | "จองครบ" | "พอ" | "รอผลผลิต" | "ไม่พอ";
};

/**
 * แท็กผลตรวจสต๊อก 3 สถานะ — ของในคลังครอบคลุม / รอผลผลิต / ไม่พอจริง
 * isAvailable จาก backend = คลังครอบคลุมยอดที่ยังไม่จ่าย (ไม่นับใบขอผลิต)
 */
export function stockVerificationLineTag(
  line: SalesOrderStockVerificationLine,
): StockVerificationLineTag {
  const ordered = toQty(line.orderedQty);
  const reserved = toQty(line.reservedQty);
  const issued = toQty(line.issuedQty);
  const unplanned = toQty(line.unplannedShortageQty ?? line.shortageQty);

  if (line.isAvailable) {
    if (issued >= ordered - QTY_EPSILON) {
      return { color: "success", label: "จ่ายแล้ว" };
    }
    if (reserved >= ordered - QTY_EPSILON) {
      return { color: "success", label: "จองครบ" };
    }
    return { color: "success", label: "พอ" };
  }
  if (unplanned <= QTY_EPSILON) {
    return { color: "processing", label: "รอผลผลิต" };
  }
  return { color: "error", label: "ไม่พอ" };
}
