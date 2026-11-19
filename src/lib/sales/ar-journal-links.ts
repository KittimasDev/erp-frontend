import { AR_DEBIT_BASE, arReceiptRoutes, arRoutes } from "@/lib/sales/ar-routes";
import type { ArJournalEntry, ArJournalRef } from "@/types/ar-journal";

/** ลิงก์ไปเอกสารอ้างอิงของรายการสมุดรายวันขาย/รับ (ใบแจ้งหนี้ / ใบสั่งขาย / ใบลดหนี้ / ใบรับชำระ) */
export function arRefHref(ref: ArJournalRef): string {
  switch (ref.type) {
    case "AR_INVOICE":
      return arRoutes.detail(ref.id);
    case "SALES_ORDER":
      return `/sales-orders/${ref.id}`;
    case "CREDIT_NOTE":
      return `/finance/receivables/credit-notes/${ref.id}`;
    case "RECEIPT":
      return arReceiptRoutes.detail(ref.id);
  }
}

/** ลิงก์ไปเอกสารต้นทางของรายการ — ใช้ตรวจสอบย้อนกลับ */
export function arSourceHref(entry: ArJournalEntry): string | null {
  switch (entry.sourceType) {
    case "AR_INVOICE":
      return arRoutes.detail(entry.sourceId);
    case "DEBIT_NOTE":
      return `${AR_DEBIT_BASE}/${entry.sourceId}`;
    case "CREDIT_NOTE":
      return `/finance/receivables/credit-notes/${entry.sourceId}`;
    case "RECEIPT":
    case "DEPOSIT":
      return arReceiptRoutes.detail(entry.sourceId);
    case "REFUND":
      return "/finance/receivables/refunds";
    case "CREDIT_APPLY":
    case "CN_CREDIT": {
      const ref = entry.refs[0];
      return ref ? arRefHref(ref) : null;
    }
  }
}

/** เส้นทางหน้ารายละเอียดรายการสมุดรายวัน (id มีเครื่องหมาย : จึง encode) */
export function arJournalDetailHref(base: string, entryId: string): string {
  return `${base}/${encodeURIComponent(entryId)}`;
}
