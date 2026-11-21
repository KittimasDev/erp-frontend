import type {
  AdvanceCandidate,
  SalesInvoiceAdvanceDeductionInput,
} from "@/types/sales-invoices";

/** ข้อความ (คีย์ภาษาไทย — ส่งเข้า t() ตอนแสดงผล) */
export const ADV_ERR_AMOUNT_NOT_POSITIVE = "ยอดหักต้องมากกว่า 0";
export const ADV_ERR_OVER_REMAINING = "ยอดหักเกินเงินมัดจำคงเหลือ";
export const ADV_ERR_OVER_CAP = "ยอดหักรวมเกินเงินล่วงหน้าที่ยังใช้ได้";

const EPSILON = 0.004;

export type AdvanceDeductionError = {
  /** undefined = error รวม (sum > cap) */
  advanceReceiptId?: string;
  message: string;
};

/**
 * ตรวจยอดหักมัดจำ — ใช้ทั้งใน AdvanceDeductionPicker (แสดง alert) และหน้า create/edit (กัน submit)
 * - ไม่เลือกแถวเลย (value = []) = ผ่าน
 * - รายแถว: amount <= 0 / amount > remainingAmount
 * - รวม: sum > cap
 * `items` = `useAdvanceCandidatesQuery(...).data?.data.items`, `cap` = `maxDeductibleAmount`
 * ถ้ายังโหลด candidates ไม่เสร็จ (items ว่าง) จะข้ามเช็ค remaining/cap เหลือแค่ amount > 0
 */
export function advanceDeductionErrors(
  value: SalesInvoiceAdvanceDeductionInput[],
  items: Pick<AdvanceCandidate, "id" | "remainingAmount">[] | undefined,
  cap: number | undefined,
): AdvanceDeductionError[] {
  if (value.length === 0) return [];
  const errors: AdvanceDeductionError[] = [];
  const byId = new Map((items ?? []).map((row) => [row.id, row]));
  let sum = 0;
  for (const line of value) {
    const amount = Number(line.amount);
    sum += Number.isFinite(amount) ? amount : 0;
    if (!Number.isFinite(amount) || !(amount > 0)) {
      errors.push({
        advanceReceiptId: line.advanceReceiptId,
        message: ADV_ERR_AMOUNT_NOT_POSITIVE,
      });
      continue;
    }
    const remaining = byId.get(line.advanceReceiptId)?.remainingAmount;
    if (remaining !== undefined && amount > Number(remaining) + EPSILON) {
      errors.push({
        advanceReceiptId: line.advanceReceiptId,
        message: ADV_ERR_OVER_REMAINING,
      });
    }
  }
  if (cap !== undefined && Number.isFinite(cap) && items && items.length > 0 && sum > cap + EPSILON) {
    errors.push({ message: ADV_ERR_OVER_CAP });
  }
  return errors;
}

/** แยกยอดหัก (รวม VAT) เป็นฐาน/VAT แบบ EXCLUSIVE — ใช้ vatRate ของใบรับเงิน (default 7) */
export function splitAdvanceDeduction(
  amount: number,
  row: Pick<AdvanceCandidate, "vatRate" | "remainingVatAmount">,
): { base: number; vat: number } {
  const rateNum = Number(row.vatRate);
  const hasRate = Number.isFinite(rateNum) && rateNum > 0;
  const remainingVat = Number(row.remainingVatAmount ?? 0);
  if (!hasRate && !(remainingVat > 0)) {
    return { base: amount, vat: 0 };
  }
  const rate = hasRate ? rateNum : 7;
  const base = Math.round((amount / (1 + rate / 100)) * 100) / 100;
  const vat = Math.round((amount - base) * 100) / 100;
  return { base, vat };
}
