import dayjs from "dayjs";
import { vatAmountLabel } from "@/lib/money/vat-totals";
import {
  AP_DOCUMENT_STATUS_LABEL,
  AP_SETTLEMENT_METHOD_LABEL,
  type ApDocument,
} from "@/types/ap-documents";
import { PO_CHARGE_TYPE_LABEL } from "@/types/purchase-orders";

import { numberToThaiBahtText } from "./numberToThaiBahtText";
import {
  escapeHtml,
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

/** ป้ายสถานะบนหัวกระดาษ — ใบที่อนุมัติแล้วไม่มีป้าย (ใช้ร่วมทุกประเภทเอกสาร) */
function draftBannerOf(doc: ApDocument): string | undefined {
  if (doc.status === "APPROVED") return undefined;
  if (doc.status === "CANCELLED") {
    return `ยกเลิกแล้ว${doc.cancelReason ? ` — ${doc.cancelReason}` : ""}`;
  }
  if (doc.status === "PENDING_APPROVAL") return "รออนุมัติ — ยังไม่อนุมัติ";
  if (doc.status === "REJECTED") return "ไม่อนุมัติ";
  return "ร่าง — ยังไม่อนุมัติ";
}

/** เพิ่มแถวเสมอ — ช่องที่ระบบไม่มีข้อมูลพิมพ์เป็น "—" เพื่อให้แบบฟอร์มครบทุกช่องตามแบบของบริษัท */
function pushRow(
  rows: SalesCommercialPdfInfoRow[],
  label: string,
  value: string | null | undefined,
  options?: Pick<SalesCommercialPdfInfoRow, "emphasis" | "full">,
) {
  rows.push({ label, value: (value ?? "").trim(), ...options });
}

/**
 * ใบลดหนี้เจ้าหนี้ (AP Credit Note) — จัดเนื้อหาตามแบบฟอร์มบริษัท แต่ใช้ดีไซน์/ตัวแบ่งหน้าของ template เอกสารกลาง
 *
 * ตารางใช้คอลัมน์ที่ระบบเก็บจริง (จำนวน × ราคา = มูลค่าที่ลดลง) — ระบบไม่ได้เก็บ "มูลค่าเดิม/ที่ถูกต้อง" ต่อบรรทัด
 * จึงไม่พิมพ์สองคอลัมน์นั้น · ฟิลด์ที่ไม่มีข้อมูลไม่พิมพ์ (ประเภทเหตุผล ผู้ติดต่อ ใบกำกับภาษีเดิม ฯลฯ)
 */
function buildCreditNotePdfData(doc: ApDocument): SalesCommercialPdfData {
  const creditorRows: SalesCommercialPdfInfoRow[] = [];
  pushRow(creditorRows, "รหัสเจ้าหนี้", doc.creditorCode);
  pushRow(creditorRows, "ชื่อเจ้าหนี้", doc.creditorName, { emphasis: true });
  pushRow(creditorRows, "ที่อยู่", doc.creditorAddress);
  pushRow(creditorRows, "เลขประจำตัวผู้เสียภาษี", doc.creditorTaxId);
  // ระบบยังไม่เก็บผู้ติดต่อ/โทรของเจ้าหนี้ใน payload ใบลดหนี้ — ช่องคงไว้ตามแบบฟอร์ม
  pushRow(creditorRows, "ผู้ติดต่อ / โทร.", "");

  const refRows: SalesCommercialPdfInfoRow[] = [];
  pushRow(refRows, "ใบลดหนี้ผู้ขายเลขที่", doc.supplierDocNo);
  pushRow(
    refRows,
    "วันที่ใบลดหนี้ผู้ขาย",
    doc.supplierDocDate ? thaiDate(doc.supplierDocDate) : "",
  );
  pushRow(refRows, "AP Invoice", doc.referenceDocumentNo);
  // ใบกำกับภาษีเดิม: ระบบยังไม่ส่งเลขที่/วันที่มากับใบลดหนี้ — ช่องคงไว้ตามแบบฟอร์ม
  pushRow(refRows, "ใบกำกับภาษีเดิม", "");
  pushRow(refRows, "วันที่ใบกำกับภาษีเดิม", "");
  pushRow(
    refRows,
    "PO / GRN",
    `${doc.purchaseOrderNo || "—"} / ${doc.goodsReceiptNo || "—"}`,
  );
  pushRow(refRows, "การคิด VAT", VAT_MODE_TEXT[doc.vatMode] ?? doc.vatMode);
  pushRow(
    refRows,
    "วิธีจัดการยอด",
    AP_SETTLEMENT_METHOD_LABEL[doc.settlementMethod ?? "OFFSET_AP"] ??
      doc.settlementMethod,
  );
  pushRow(
    refRows,
    "สถานะ",
    AP_DOCUMENT_STATUS_LABEL[doc.status] ?? doc.status,
  );

  // สาเหตุ + ประเภทเหตุผล (ระบบเก็บเฉพาะข้อความสาเหตุ ยังไม่มีประเภทเหตุผลแยก)
  const reasonRows: SalesCommercialPdfInfoRow[] = [];
  pushRow(reasonRows, "สาเหตุการลดหนี้", doc.reason, { full: true });
  pushRow(reasonRows, "ประเภทเหตุผล", "", { full: true });

  const infoSections = [
    { title: "ข้อมูลเจ้าหนี้ / ผู้ขาย", rows: creditorRows },
    { title: "เอกสารอ้างอิง", rows: refRows },
    { title: "สาเหตุการลดหนี้", rows: reasonRows },
  ];

  const vatRatePart =
    typeof doc.vatRate === "number" && doc.vatRate > 0 ? ` ${doc.vatRate}%` : "";
  const bahtText = numberToThaiBahtText(doc.totalAmount);

  return {
    pageId: "ap-credit-note-pdf",
    titleTh: "ใบลดหนี้เจ้าหนี้",
    titleEn: "AP CREDIT NOTE",
    docNo: doc.docNo,
    docDate: thaiDate(doc.docDate),
    draftBanner: draftBannerOf(doc),
    infoRows: [],
    infoSections,
    items: doc.items.map((item, index) => ({
      no: index + 1,
      itemCode: item.itemCode ?? "—",
      itemName: item.description,
      unit: item.unitLabel ?? "—",
      qty: item.quantity,
      unitPrice: item.unitPrice,
      // amount ใน payload หักส่วนลดบรรทัดแล้ว (calcLineAmount) — คอลัมน์ส่วนลดแสดงเพื่อข้อมูลเท่านั้น
      discountAmount: item.discountAmount ?? 0,
      amount: item.amount,
    })),
    columnLabels: { price: "ราคา/หน่วย", amount: "มูลค่าที่ลดลง" },
    withPrices: true,
    subtotalAmount: doc.subtotalAmount,
    vatAmount: doc.vatAmount,
    totalAmount: doc.totalAmount,
    totalsLines: [
      { label: "มูลค่าลดหนี้ก่อน VAT", value: doc.subtotalAmount },
      { label: `VAT ที่ลดลง${vatRatePart}`, value: doc.vatAmount },
      { label: "รวมยอดลดหนี้", value: doc.totalAmount, grand: true },
    ],
    afterTableHtml: bahtText
      ? `<div style="text-align:right;font-size:11px;color:#5b6b63;margin-top:4px;">( ${escapeHtml(bahtText)} )</div>`
      : undefined,
    remark: [
      doc.remark ?? "",
      "เอกสารนี้เป็นแบบฟอร์มบันทึกใบลดหนี้เจ้าหนี้ภายใน ERP ไม่ใช่ใบลดหนี้ภาษีที่บริษัทออกแทนผู้ขาย",
    ]
      .filter(Boolean)
      .join("\n"),
    signatures: [
      { title: "ผู้จัดทำ", name: doc.createdByName ?? undefined },
      "ผู้ตรวจสอบ",
      { title: "ผู้อนุมัติ", name: doc.approvedByName ?? undefined },
    ],
  };
}

/**
 * ใบตั้งหนี้ / ใบเพิ่มหนี้ เจ้าหนี้ (TOR Phase 1 ข้อ 4.4) — ใช้ template เอกสารขายตัวเดียวกับใบลดหนี้
 *
 * ใบที่ยังไม่อนุมัติหรือถูกยกเลิก พิมพ์ป้ายเตือนไว้หัวกระดาษ กันเอาใบร่างไปใช้เป็นใบจริง
 */
export function buildApDocumentPdfData(doc: ApDocument): SalesCommercialPdfData {
  // ใบลดหนี้ใช้เนื้อหาตามแบบฟอร์มของบริษัท — ใบตั้งหนี้/ใบเพิ่มหนี้ยังใช้ชุดเดิมด้านล่าง
  if (doc.docType === "CREDIT_NOTE") return buildCreditNotePdfData(doc);
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
    infoRows.push({
      label: "เหตุผลที่เพิ่มหนี้",
      value: doc.reason,
      full: true,
    });
  }

  const draftBanner = draftBannerOf(doc);

  return {
    pageId: isInvoice ? "ap-invoice-pdf" : "ap-debit-note-pdf",
    titleTh: isInvoice ? "ใบตั้งหนี้" : "ใบเพิ่มหนี้",
    titleEn: isInvoice ? "ACCOUNTS PAYABLE INVOICE" : "DEBIT NOTE",
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
        label: isInvoice ? "ยอดตั้งหนี้" : "ยอดเพิ่มหนี้",
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
