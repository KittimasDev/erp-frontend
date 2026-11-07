import { money } from "@/components/ap-documents/apDocumentConfig";
import { getStoredLanguage } from "@/lib/i18n/language";
import { translate } from "@/lib/i18n/translate";
import { PV_KIND_LABEL, PV_SOURCE_LABEL } from "@/types/payment-vouchers";

/** ลิงก์ไปเอกสารต้นทาง */
export function sourceHref(sourceType: string, sourceId: string, purchaseOrderId?: string): string | undefined {
  if (sourceType === "ADVANCE_REQUEST" && sourceId) return `/finance/payables/advance-requests/${sourceId}`;
  if (sourceType === "BILLING_NOTE" && sourceId) return `/finance/payables/billing-notes/${sourceId}`;
  if (sourceType === "AP_INVOICE" && sourceId) return `/finance/payables/ap-invoices/${sourceId}`;
  if (sourceType === "PURCHASE_ORDER" && purchaseOrderId) return `/purchase-orders/${purchaseOrderId}`;
  return undefined;
}

export const PV_BASE_PATH = "/finance/payables/payment-vouchers";
export const PV_PAYMENT_RECORDS_PATH = "/finance/payables/payment-records";
export const PAYMENT_RECORDS_PATH = PV_PAYMENT_RECORDS_PATH;

export const fmtMoney = (v: string | number | null | undefined) => money.format(Number(v ?? 0));

/** ในบริบทป้ายสถานะ/ชื่อเอกสาร/เหตุการณ์ของ PV — คำไทยเดียวกับปุ่ม/เมนูแต่ความหมายอังกฤษต่างกัน */
const FIN_EN_OVERRIDE: Record<string, string> = {
  ยกเลิก: "Cancelled",
  แก้ไข: "Edited",
  ไม่อนุมัติ: "Rejected",
  ตรวจสอบ: "Reviewed",
  บันทึกจ่ายเงิน: "Record payment",
  ยังไม่ส่ง: "Not sent",
  ส่งสำเร็จ: "Sent",
  มี: "Yes",
  ใบวางบิล: "Billing note",
};

/** แปลป้ายสถานะ/ประเภท/เหตุการณ์ของ PV, ใบวางบิล, ขอจ่ายล่วงหน้า ตามภาษา — เรียกตอนเรนเดอร์ในคอมโพเนนต์ที่ใช้ useT() อยู่แล้ว */
export function tFin(label: string): string {
  const lang = getStoredLanguage();
  if (lang === "en" && FIN_EN_OVERRIDE[label]) return FIN_EN_OVERRIDE[label];
  return translate(lang, label);
}

export const sourceLabel = (t?: string) => PV_SOURCE_LABEL[t ?? "PURCHASE_ORDER"] ? tFin(PV_SOURCE_LABEL[t ?? "PURCHASE_ORDER"]) : (t ?? "—");
export const kindLabel = (k?: string) => (k ? (PV_KIND_LABEL[k] ? tFin(PV_KIND_LABEL[k]) : k) : "—");

/** แบ่งยอดตามสัดส่วนแบบเดียวกับ backend (เฉพาะแสดงตัวอย่างบนฟอร์ม — ตัวเลขจริงคิดที่ backend) */
export function prorateAmount(value: number, part: number, whole: number): number {
  if (!(whole > 0)) return 0;
  return Math.round(((value * 100 * part) / whole)) / 100;
}

/** รองรับเลขที่เอกสารอ้างอิงหลายใบ เช่น "ADV-690001 · PO-6900101" */
export function referenceLine(info: {
  sources: Array<{ documentNo: string }>;
  purchaseOrders: Array<{ poNo: string }>;
  apDocuments: Array<{ docNo: string }>;
}): string {
  return [
    ...info.sources.map((s) => s.documentNo),
    ...info.apDocuments.map((a) => a.docNo),
    ...info.purchaseOrders.map((p) => p.poNo),
  ]
    .filter((v, i, arr) => v && arr.indexOf(v) === i)
    .join(" · ");
}
