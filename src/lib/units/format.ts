import { QUANTITY_PRECISION, roundQty } from "./conversion";

/**
 * ชื่อฟิลด์หน่วยในระบบไม่ standard — ส่วนใหญ่ใช้ unitNameTh/unitCode
 * แต่ types/sales-invoices.ts และ types/inventory.ts ใช้ unitName
 * helper นี้กลืนความต่างนั้นไว้ที่เดียว จะได้ไม่ต้องไล่แก้ type ทั้งระบบ
 */
export function pickUnitLabel(row: unknown): string {
  if (!row || typeof row !== "object") {
    return "";
  }

  const record = row as Record<string, unknown>;
  const nested = record.unit as Record<string, unknown> | undefined;

  const candidates = [
    record.unitNameTh,
    record.unitCode,
    record.unitName,
    nested?.nameTh,
    nested?.code,
  ];

  const found = candidates.find(
    (value) => typeof value === "string" && value.trim() !== "",
  );

  return typeof found === "string" ? found : "";
}

/** ตัดศูนย์ท้ายทศนิยมทิ้งเพื่อให้อ่านง่าย (75.000 -> 75, 0.500 -> 0.5) */
export function formatQty(
  qty: number | string | null | undefined,
  precision = QUANTITY_PRECISION,
): string {
  if (qty === null || qty === undefined || qty === "") {
    return "-";
  }

  const value = Number(qty);
  if (!Number.isFinite(value)) {
    return "-";
  }

  return roundQty(value, precision)
    .toFixed(precision)
    .replace(/\.?0+$/, "");
}

export function formatQtyUnit(
  qty: number | string | null | undefined,
  unitLabel: string,
  precision = QUANTITY_PRECISION,
): string {
  const formatted = formatQty(qty, precision);
  return unitLabel ? `${formatted} ${unitLabel}` : formatted;
}

export type FormatQtyWithBaseArgs = {
  qty: number | string | null | undefined;
  unitLabel: string;
  baseQty?: number | string | null;
  baseUnitLabel?: string;
  precision?: number;
};

/**
 * แสดงจำนวนที่ผู้ใช้กรอก พร้อมวงเล็บหน่วยหลักเมื่อคนละหน่วยกัน — "3 มัด (75 กก.)"
 * ถ้ายังไม่มี baseQty (backend เก่า) หรือหน่วยเดียวกัน จะแสดงเหมือนเดิมทุกประการ
 * ทำให้ rollout หน้าจอได้ก่อน backend โดยหน้าตาไม่เปลี่ยน
 */
export function formatQtyWithBase({
  qty,
  unitLabel,
  baseQty,
  baseUnitLabel,
  precision = QUANTITY_PRECISION,
}: FormatQtyWithBaseArgs): string {
  const primary = formatQtyUnit(qty, unitLabel, precision);

  if (
    baseQty === null ||
    baseQty === undefined ||
    baseQty === "" ||
    !baseUnitLabel ||
    baseUnitLabel === unitLabel
  ) {
    return primary;
  }

  return `${primary} (${formatQtyUnit(baseQty, baseUnitLabel, precision)})`;
}
