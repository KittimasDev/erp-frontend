import dayjs from "dayjs";
import { vatAmountLabel } from "@/lib/money/vat-totals";
import { AP_SETTLEMENT_METHOD_LABEL, type ApDocument } from "@/types/ap-documents";
import { PO_CHARGE_TYPE_LABEL } from "@/types/purchase-orders";

import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
  type SalesCommercialPdfInfoRow,
} from "./pdf-common";

function thaiDate(value?: string | null) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  // วันที่ล้วน (YYYY-MM-DD) → dayjs ในโซนท้องถิ่น ไม่เลื่อนวัน · ปี พ.ศ. ผ่าน token BBBB
  return dayjs(new Date(y, m - 1, d)).format("DD/MM/BBBB");
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
  const isCredit = doc.docType === "CREDIT_NOTE";
  const infoRows: SalesCommercialPdfInfoRow[] = [
    {
      label: "เจ้าหนี้",
      value: `${doc.creditorCode} ${doc.creditorName}`.trim(),
      emphasis: true,
    },
    { label: "เลขประจำตัวผู้เสียภาษี", value: doc.creditorTaxId || "—" },
    {
      label: isInvoice ? "เลขที่ใบแจ้งหนี้ผู้ขาย" : isCredit ? "เลขที่ใบลดหนี้ผู้ขาย" : "เลขที่ใบเพิ่มหนี้ผู้ขาย",
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
  if (isCredit) {
    infoRows.push({
      label: "วิธีจัดการยอด",
      value: AP_SETTLEMENT_METHOD_LABEL[doc.settlementMethod ?? "OFFSET_AP"] ?? doc.settlementMethod ?? "—",
    });
  }
  if (!isInvoice && doc.reason) {
    infoRows.push({
      label: isCredit ? "สาเหตุที่ลดหนี้" : "เหตุผลที่เพิ่มหนี้",
      value: doc.reason,
      full: true,
    });
  }

  const draftBanner =
    doc.status === "APPROVED"
      ? undefined
      : doc.status === "CANCELLED"
        ? `ยกเลิกแล้ว${doc.cancelReason ? ` — ${doc.cancelReason}` : ""}`
        : doc.status === "PENDING_APPROVAL"
          ? "รออนุมัติ — ยังไม่อนุมัติ"
          : doc.status === "REJECTED"
            ? "ไม่อนุมัติ"
            : "ร่าง — ยังไม่อนุมัติ";

  return {
    pageId: isInvoice ? "ap-invoice-pdf" : isCredit ? "ap-credit-note-pdf" : "ap-debit-note-pdf",
    titleTh: isInvoice ? "ใบตั้งหนี้" : isCredit ? "ใบลดหนี้" : "ใบเพิ่มหนี้",
    titleEn: isInvoice ? "ACCOUNTS PAYABLE INVOICE" : isCredit ? "CREDIT NOTE" : "DEBIT NOTE",
    docNo: doc.docNo,
    docDate: thaiDate(doc.docDate),
    draftBanner,
    infoRows,
    // ค่าใช้จ่ายเพิ่มเติมจาก PO พิมพ์ต่อท้ายรายการสินค้า (ก่อน VAT) — VAT รวมอยู่ในยอด VAT ท้ายเอกสาร
    items: [
      ...doc.items.map((item, index) => ({
        no: index + 1,
        itemCode: item.itemCode ?? "—",
        itemName: item.description,
        unit: item.unitLabel ?? "—",
        qty: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
      ...(doc.charges ?? []).map((charge, index) => ({
        no: doc.items.length + index + 1,
        itemCode: "—",
        itemName: `${PO_CHARGE_TYPE_LABEL[charge.chargeType] ?? charge.chargeType}: ${charge.description}`,
        unit: "—",
        qty: 1,
        unitPrice: charge.amountBeforeVat,
        amount: charge.amountBeforeVat,
      })),
    ],
    withPrices: true,
    subtotalAmount: doc.subtotalAmount,
    vatAmount: doc.vatAmount,
    totalAmount: doc.totalAmount,
    totalsLines: [
      { label: "มูลค่าก่อน VAT", value: doc.subtotalAmount },
      {
        label: doc.charges?.length ? "ภาษีมูลค่าเพิ่ม (สินค้า + ค่าใช้จ่าย)" : vatAmountLabel(doc.vatRate),
        value: doc.vatAmount,
      },
      {
        label: isInvoice ? "ยอดตั้งหนี้" : isCredit ? "ยอดลดหนี้" : "ยอดเพิ่มหนี้",
        value: doc.totalAmount,
        grand: true,
      },
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
