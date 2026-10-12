import { vatAmountLabel } from "@/lib/money/vat-totals";
import type { ApDocument } from "@/types/ap-documents";

import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
  type SalesCommercialPdfInfoRow,
} from "./pdf-common";

function thaiDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y + 543}`;
}

const VAT_MODE_TEXT: Record<string, string> = {
  EXCLUSIVE: "ราคาไม่รวม VAT",
  INCLUSIVE: "ราคารวม VAT แล้ว",
  NONE: "ไม่มี VAT",
};

/**
 * ใบตั้งหนี้ / ใบเพิ่มหนี้ เจ้าหนี้ (TOR Phase 1 ข้อ 4.4) — ใช้ template เอกสารขายตัวเดียวกับใบลดหนี้
 *
 * ใบที่ยังไม่อนุมัติหรือถูกยกเลิก พิมพ์ป้ายเตือนไว้หัวกระดาษ กันเอาใบร่างไปใช้เป็นใบจริง
 */
export function buildApDocumentPdfData(doc: ApDocument): SalesCommercialPdfData {
  const isInvoice = doc.docType === "AP_INVOICE";
  const infoRows: SalesCommercialPdfInfoRow[] = [
    {
      label: "เจ้าหนี้",
      value: `${doc.creditorCode} ${doc.creditorName}`.trim(),
      emphasis: true,
    },
    { label: "เลขประจำตัวผู้เสียภาษี", value: doc.creditorTaxId || "—" },
    {
      label: isInvoice ? "เลขที่ใบแจ้งหนี้ผู้ขาย" : "เลขที่ใบเพิ่มหนี้ผู้ขาย",
      value: doc.supplierDocNo
        ? `${doc.supplierDocNo}${doc.supplierDocDate ? ` (${thaiDate(doc.supplierDocDate)})` : ""}`
        : "—",
    },
  ];
  if (isInvoice) {
    infoRows.push(
      { label: "อ้างอิงใบสั่งซื้อ", value: doc.purchaseOrderNo || "—" },
      { label: "ครบกำหนดชำระ", value: thaiDate(doc.dueDate) },
    );
  } else {
    infoRows.push({ label: "อ้างอิงใบตั้งหนี้", value: doc.referenceDocumentNo || "—" });
  }
  infoRows.push({ label: "การคิด VAT", value: VAT_MODE_TEXT[doc.vatMode] ?? doc.vatMode });
  if (doc.creditorAddress) {
    infoRows.push({ label: "ที่อยู่", value: doc.creditorAddress, full: true });
  }
  if (!isInvoice && doc.reason) {
    infoRows.push({ label: "เหตุผลที่เพิ่มหนี้", value: doc.reason, full: true });
  }

  const draftBanner =
    doc.status === "APPROVED"
      ? undefined
      : doc.status === "CANCELLED"
        ? `ยกเลิกแล้ว${doc.cancelReason ? ` — ${doc.cancelReason}` : ""}`
        : "ร่าง — ยังไม่อนุมัติ";

  return {
    pageId: isInvoice ? "ap-invoice-pdf" : "ap-debit-note-pdf",
    titleTh: isInvoice ? "ใบตั้งหนี้" : "ใบเพิ่มหนี้",
    titleEn: isInvoice ? "ACCOUNTS PAYABLE INVOICE" : "DEBIT NOTE",
    docNo: doc.docNo,
    docDate: thaiDate(doc.docDate),
    draftBanner,
    infoRows,
    items: doc.items.map((item, index) => ({
      no: index + 1,
      itemCode: item.itemCode ?? "—",
      itemName: item.description,
      unit: item.unitLabel ?? "—",
      qty: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
    })),
    withPrices: true,
    subtotalAmount: doc.subtotalAmount,
    vatAmount: doc.vatAmount,
    totalAmount: doc.totalAmount,
    totalsLines: [
      { label: "มูลค่าก่อน VAT", value: doc.subtotalAmount },
      { label: vatAmountLabel(doc.vatRate), value: doc.vatAmount },
      { label: isInvoice ? "ยอดตั้งหนี้" : "ยอดเพิ่มหนี้", value: doc.totalAmount, grand: true },
    ],
    remark: doc.remark ?? "",
    signatures: [
      { title: "ผู้บันทึก", name: doc.createdByName ?? undefined },
      { title: "ผู้อนุมัติ", name: doc.approvedByName ?? undefined },
      "ผู้ตรวจสอบ",
    ],
  };
}

export async function generateApDocumentPdf(doc: ApDocument) {
  await generateSalesCommercialPdf(buildApDocumentPdfData(doc));
}
