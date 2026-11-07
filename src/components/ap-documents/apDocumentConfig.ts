import {
  calcDocumentTotals,
  calcLineAmount,
  resolveVatMode,
} from "@/lib/money/vat-totals";
import { getStoredLanguage } from "@/lib/i18n/language";
import { tNow } from "@/lib/i18n/useT";
import { AP_EVENT_LABEL, type ApDocumentKind } from "@/types/ap-documents";

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
  creditNote: {
    kind: "creditNote",
    title: "ใบลดหนี้เจ้าหนี้",
    shortLabel: "ใบลดหนี้",
    basePath: "/finance/payables/credit-notes",
    screenCode: "FINANCE_PAYABLE_CREDIT_NOTES",
  },
};

const AP_EVENT_LABEL_EN: Record<string, string> = {
  CREATE: "Created AP invoice",
  UPDATE: "Edited",
  SUBMIT: "Submitted for approval",
  APPROVE: "Approved",
  REJECT: "Rejected",
  CANCEL: "Cancelled",
  ADJUST: "Debt adjustment",
  ISSUE_PV: "Payment voucher issued (queued)",
  CANCEL_PV_QUEUE: "Cancelled pending payment voucher item",
  DEPOSIT_ALLOCATED: "Deposit allocated",
  BILLING_RESERVE: "Added to billing note",
  BILLING_RELEASE: "Billing amount released",
  REFUND: "Refund received",
  CANCEL_REFUND: "Refund cancelled",
  USE_CREDIT: "Supplier credit applied",
  CHARGE_ALLOCATED: "PO additional charges allocated",
};

/** ป้ายเหตุการณ์ในประวัติ AP ตามภาษา (แยกจากป้ายสถานะ เพราะ "แก้ไข"/"ยกเลิก" ในที่นี้คือการกระทำ) */
export function apEventLabel(action: string): string {
  if (getStoredLanguage() === "en" && AP_EVENT_LABEL_EN[action]) return AP_EVENT_LABEL_EN[action];
  return AP_EVENT_LABEL[action] ?? action;
}

const AP_SHORT_LABEL_EN: Record<ApDocumentKind, string> = {
  invoice: "AP invoice",
  debitNote: "Debit note",
  creditNote: "Credit note",
};
const AP_FULL_LABEL_EN: Record<ApDocumentKind, string> = {
  invoice: "AP invoice",
  debitNote: "AP debit note",
  creditNote: "AP credit note",
};

/** ชื่อสั้นของเอกสาร (เอกพจน์ในภาษาอังกฤษ) ใช้ต่อท้ายประโยค เช่น "สร้าง{label}" */
export function apShortLabel(config: ApDocumentConfig): string {
  return getStoredLanguage() === "en" ? AP_SHORT_LABEL_EN[config.kind] : config.shortLabel;
}

/** ชื่อเต็มของเอกสาร (เอกพจน์ในภาษาอังกฤษ) */
export function apFullLabel(config: ApDocumentConfig): string {
  return getStoredLanguage() === "en" ? AP_FULL_LABEL_EN[config.kind] : config.title;
}

export const money = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 11/10/2569 */
export function formatThaiDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return value;
  const year = getStoredLanguage() === "en" ? y : y + 543;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${year}`;
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
      return term.advancePercent >= 100
        ? tNow("ชำระล่วงหน้าเต็มจำนวน")
        : tNow("มัดจำ {n}%", { n: term.advancePercent });
    case "ON_RECEIPT":
      return tNow("ชำระเมื่อรับสินค้า");
    case "CREDIT":
      return tNow("เครดิต {n} วัน", { n: term.creditDays });
    default:
      return term.name ?? tNow("ไม่ระบุเงื่อนไข");
  }
}
