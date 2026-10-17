import {
  calcDocumentTotals,
  calcLineAmount,
  resolveVatMode,
} from "@/lib/money/vat-totals";
import type { ApDocumentKind } from "@/types/ap-documents";

/**
 * ใบตั้งหนี้กับใบเพิ่มหนี้ใช้หน้าจอชุดเดียวกัน ต่างกันที่ข้อความ เส้นทาง และรหัสสิทธิ์
 * รหัสหน้าจอต้องตรงกับ `SCREEN_SEED_DEFINITIONS` (backend) และเมนูใน AppHeader
 */
export type ApDocumentConfig = {
  kind: ApDocumentKind;
  title: string;
  shortLabel: string;
  basePath: string;
  screenCode: string;
};

export const AP_DOCUMENT_CONFIG: Record<ApDocumentKind, ApDocumentConfig> = {
  invoice: {
    kind: "invoice",
    title: "ใบตั้งหนี้เจ้าหนี้",
    shortLabel: "ใบตั้งหนี้",
    basePath: "/finance/payables/ap-invoices",
    screenCode: "FINANCE_AP_INVOICES",
  },
  debitNote: {
    kind: "debitNote",
    title: "ใบเพิ่มหนี้เจ้าหนี้",
    shortLabel: "ใบเพิ่มหนี้",
    basePath: "/finance/payables/debit-notes",
    screenCode: "FINANCE_PAYABLE_DEBIT_NOTES",
  },
};

export const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 11/10/2569 */
export function formatThaiDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y + 543}`;
}

/**
 * ยอดตัวอย่างระหว่างกรอก — ใช้ `calcDocumentTotals` สำเนาฝั่งหน้าเว็บของ helper backend
 * (สูตรและการปัดเหมือนกันทุกตัว) ยอดจริงที่บันทึกคิดที่ backend เสมอ
 */
export function previewTotals(
  lines: Array<{ quantity?: number; unitPrice?: number; discountAmount?: number }>,
  vatMode: string,
  vatRate: number,
) {
  const totals = calcDocumentTotals(
    lines.map((line) => calcLineAmount(line.quantity ?? 0, line.unitPrice ?? 0, line.discountAmount ?? 0)),
    0,
    resolveVatMode(vatMode),
    vatRate,
  );
  return { subtotal: totals.taxableBase, vat: totals.vat, total: totals.total };
}

/** เงื่อนไขการชำระ: ล่วงหน้า/มัดจำ, เมื่อรับสินค้า, เครดิต X วัน (ข้อความเดียวกับหน้ารายการจ่ายเงิน) */
export function termText(term: {
  termType?: string;
  name?: string;
  creditDays: number;
  advancePercent: number;
}): string {
  switch (term.termType) {
    case "ADVANCE":
      return term.advancePercent >= 100 ? "ชำระล่วงหน้าเต็มจำนวน" : `มัดจำ ${term.advancePercent}%`;
    case "ON_RECEIPT":
      return "ชำระเมื่อรับสินค้า";
    case "CREDIT":
      return `เครดิต ${term.creditDays} วัน`;
    default:
      return term.name ?? "ไม่ระบุเงื่อนไข";
  }
}
