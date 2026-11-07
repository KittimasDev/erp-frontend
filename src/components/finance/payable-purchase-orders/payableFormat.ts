import { formatThaiDate as formatThaiDateBe, money } from "@/components/ap-documents/apDocumentConfig";
import { getStoredLanguage } from "@/lib/i18n/language";
import { translate, type Language } from "@/lib/i18n/translate";
import {
  PAYABLE_ITEM_STATUS_LABEL,
  type PayablePaymentTerm,
  type PayablePurchaseOrder,
  type PayableTermTypeFilter,
  type PayableItemStatus,
} from "@/types/payable-purchase-orders";
import type { TabularReport } from "@/utils/downloadTabularReport";

export const SCREEN_CODE = "FINANCE_PAYABLE_CREDITORS";

export const TERM_TYPE_FILTER_LABEL: Record<PayableTermTypeFilter, string> = {
  ADVANCE: "ชำระล่วงหน้า / มัดจำ",
  ON_RECEIPT: "ชำระเมื่อรับสินค้า",
  CREDIT: "เครดิต",
  NONE: "ไม่ระบุเงื่อนไข",
};

/** "มัดจำ 30%" / "ชำระล่วงหน้า 100%" / "ชำระเมื่อรับสินค้า" / "เครดิต 30 วัน" — lang ไม่ส่ง = ภาษาปัจจุบัน */
export function describeTerm(term: PayablePaymentTerm | null, lang?: Language) {
  const tr = (thai: string, params?: Record<string, string | number>) =>
    translate(lang ?? getStoredLanguage(), thai, params);
  if (!term) return tr("ไม่ระบุเงื่อนไข");
  switch (term.termType) {
    case "ADVANCE":
      return term.advancePercent >= 100
        ? tr("ชำระล่วงหน้าเต็มจำนวน")
        : tr("มัดจำ {n}%", { n: term.advancePercent });
    case "ON_RECEIPT":
      return tr("ชำระเมื่อรับสินค้า");
    case "CREDIT":
      return tr("เครดิต {n} วัน", { n: term.creditDays });
    default:
      return term.name;
  }
}

/** วันที่ dd/mm/yyyy — ไทย = พ.ศ., อังกฤษ = ค.ศ. */
export function formatThaiDate(value?: string | null) {
  if (getStoredLanguage() !== "en") return formatThaiDateBe(value);
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export { money };

export function toPayableSheet(
  rows: PayablePurchaseOrder[],
  options: { filters: string[]; total: number; truncated: boolean },
): TabularReport {
  const now = new Date();
  const meta = [
    `วันที่ออกรายงาน: ${formatThaiDateBe(now.toISOString().slice(0, 10))}`,
    ...options.filters,
    options.truncated
      ? `ทั้งหมด ${options.total.toLocaleString("th-TH")} รายการ — ไฟล์มีเฉพาะ ${rows.length.toLocaleString("th-TH")} รายการแรก`
      : `ทั้งหมด ${options.total.toLocaleString("th-TH")} รายการ`,
  ];

  return {
    title: "รายการจ่ายเงิน (จากใบสั่งซื้อ)",
    filename: `payables-po-${now.toISOString().slice(0, 10)}`,
    meta,
    headers: [
      "ลำดับ",
      "เลขที่ PO",
      "วันที่ PO",
      "รหัสผู้ขาย",
      "ชื่อผู้ขาย",
      "เงื่อนไขการชำระเงิน",
      "ยอดเงินตาม PO",
      "ค่าสินค้า (รวม VAT)",
      "ค่าใช้จ่ายเพิ่มเติม (รวม VAT)",
      "ค่าใช้จ่ายที่ตั้งหนี้แล้ว",
      "ค่าใช้จ่ายคงเหลือ",
      "ยอดที่ต้องชำระตามเงื่อนไข",
      "วันครบกำหนดชำระ",
      "สถานะรายการ",
    ],
    rows: rows.map((row, index) => [
      String(index + 1),
      row.poNo,
      formatThaiDateBe(row.poDate),
      row.creditor?.creditorCode ?? "",
      row.creditor?.nameTh ?? "",
      row.paymentTerm
        ? `${describeTerm(row.paymentTerm, "th")} (${row.paymentTerm.name})`
        : describeTerm(null, "th"),
      money.format(row.totalAmount),
      money.format(row.goodsAmount),
      money.format(row.extraChargesAmount),
      money.format(row.extraChargesInvoiced),
      money.format(row.extraChargesRemaining),
      money.format(row.amountDue),
      formatThaiDateBe(row.dueDate),
      PAYABLE_ITEM_STATUS_LABEL[row.payableStatus as PayableItemStatus] ??
        row.payableStatus,
    ]),
    pdfColumns: [
      { header: "ลำดับ", cells: [0], width: 34, align: "center" },
      { header: "เลขที่ PO", cells: [1], width: 84 },
      { header: "วันที่ PO", cells: [2], width: 62, align: "center" },
      { header: "ผู้ขาย", cells: [3, 4], width: 150 },
      { header: "เงื่อนไขการชำระเงิน", cells: [5], width: 112 },
      { header: "ยอดตาม PO", cells: [6], width: 72, numeric: true },
      { header: "ค่าใช้จ่าย", cells: [8], width: 64, numeric: true },
      { header: "ที่ต้องชำระ", cells: [11], width: 72, numeric: true },
      { header: "ครบกำหนด", cells: [12], width: 58, align: "center" },
      { header: "สถานะ", cells: [13], width: 80 },
    ],
  };
}
