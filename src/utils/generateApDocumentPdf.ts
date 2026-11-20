import dayjs from "dayjs";
import { vatAmountLabel } from "@/lib/money/vat-totals";
import type { ApDocument, ApDocumentItem } from "@/types/ap-documents";
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

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * จับคู่บรรทัดใบลดหนี้กับบรรทัดของใบตั้งหนี้ที่อ้างถึง เพื่อหามูลค่าเดิม
 * ลำดับ: บรรทัด GRN เดียวกัน → สินค้า (itemId) เดียวกัน → ชื่อรายการตรงกัน → ใบละบรรทัดเดียวทั้งคู่
 * จับคู่ไม่ได้ = undefined (พิมพ์ "—" ไม่เดามูลค่า)
 */
function findReferenceLine(
  line: ApDocumentItem,
  creditItems: ApDocumentItem[],
  referenceItems: ApDocumentItem[],
): ApDocumentItem | undefined {
  const norm = (v: string) => v.trim().toLowerCase();
  const unique = (matches: ApDocumentItem[]) =>
    matches.length === 1 ? matches[0] : undefined;
  if (line.goodsReceiptItemId) {
    const hit = unique(
      referenceItems.filter(
        (ref) => ref.goodsReceiptItemId === line.goodsReceiptItemId,
      ),
    );
    if (hit) return hit;
  }
  if (line.itemId) {
    const hit = unique(referenceItems.filter((ref) => ref.itemId === line.itemId));
    if (hit) return hit;
  }
  const byName = unique(
    referenceItems.filter(
      (ref) => norm(ref.description) === norm(line.description),
    ),
  );
  if (byName) return byName;
  if (creditItems.length === 1 && referenceItems.length === 1) {
    return referenceItems[0];
  }
  return undefined;
}

/**
 * ใบลดหนี้เจ้าหนี้ (AP Credit Note) — จัดเนื้อหาตามแบบฟอร์มบริษัท แต่ใช้ดีไซน์/ตัวแบ่งหน้าของ template เอกสารกลาง
 *
 * ตาราง: ลำดับ / รายการ / มูลค่าเดิม / มูลค่าที่ถูกต้อง / มูลค่าที่ลดลง (ก่อน VAT)
 * - มูลค่าที่ลดลง = ยอดบรรทัดของใบลดหนี้ · มูลค่าเดิม = ยอดบรรทัดที่ตรงกันในใบตั้งหนี้ที่อ้างถึง
 *   มูลค่าที่ถูกต้อง = เดิม − ที่ลดลง · ใบลดหนี้ที่ไม่ผูกใบตั้งหนี้/จับคู่ไม่ได้/คนละโหมด VAT พิมพ์ "—"
 */
function buildCreditNotePdfData(
  doc: ApDocument,
  referenceInvoice?: ApDocument | null,
): SalesCommercialPdfData {
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

  // สาเหตุ: ป้ายกับค่าอยู่บรรทัดเดียวกัน (แถวปกติของกริด ไม่ใช่แถว full) การ์ดกว้างเต็มแถว
  const reasonRows: SalesCommercialPdfInfoRow[] = [];
  pushRow(reasonRows, "สาเหตุการลดหนี้", doc.reason);

  const infoSections = [
    { title: "ข้อมูลเจ้าหนี้ / ผู้ขาย", rows: creditorRows },
    { title: "เอกสารอ้างอิง", rows: refRows },
    { rows: reasonRows, wide: true },
  ];

  const vatRatePart =
    typeof doc.vatRate === "number" && doc.vatRate > 0 ? ` ${doc.vatRate}%` : "";
  const bahtText = numberToThaiBahtText(doc.totalAmount);

  // มูลค่าเดิม/ที่ถูกต้อง เทียบได้เมื่อสองใบคิดมูลค่าบรรทัดด้วยโหมดเดียวกัน และไม่ใช่โหมดรวม VAT
  // (โหมดรวม VAT ยอดบรรทัดรวมภาษีอยู่ ไม่ใช่ "ก่อน VAT" ตามหัวคอลัมน์)
  const comparable =
    referenceInvoice != null &&
    referenceInvoice.vatMode === doc.vatMode &&
    doc.vatMode !== "INCLUSIVE";
  const invoiceNo = doc.referenceDocumentNo?.trim();

  return {
    pageId: "ap-credit-note-pdf",
    titleTh: "ใบลดหนี้เจ้าหนี้",
    titleEn: "AP CREDIT NOTE",
    docNo: doc.docNo,
    docDate: thaiDate(doc.docDate),
    draftBanner: draftBannerOf(doc),
    infoRows: [],
    infoSections,
    items: doc.items.map((item, index) => {
      const ref = comparable
        ? findReferenceLine(item, doc.items, referenceInvoice.items)
        : undefined;
      return {
        no: index + 1,
        itemCode: "",
        itemName: invoiceNo
          ? `ลดราคาจากใบแจ้งหนี้ ${invoiceNo}`
          : "ลดราคาจากใบแจ้งหนี้",
        unit: "",
        qty: item.quantity,
        amount: item.amount,
        originalAmount: ref ? round2(ref.amount) : null,
        correctAmount: ref ? round2(ref.amount - item.amount) : null,
      };
    }),
    columnLabels: {
      no: "ลำดับ",
      name: "รายการ",
      original: "มูลค่าเดิม (ก่อน VAT)",
      correct: "มูลค่าที่ถูกต้อง (ก่อน VAT)",
      reduced: "มูลค่าที่ลดลง (ก่อน VAT)",
    },
    withPrices: true,
    valueColumns: true,
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
 * ใบตั้งหนี้เจ้าหนี้ (TOR Phase 1 ข้อ 4.4) — ใช้ template เอกสารขาย
 * ใบเพิ่มหนี้ไม่ผ่านฟังก์ชันนี้ — พิมพ์จาก generateApDebitNotePdf ตามแบบฟอร์ม A4 ของบริษัท
 *
 * ใบที่ยังไม่อนุมัติหรือถูกยกเลิก พิมพ์ป้ายเตือนไว้หัวกระดาษ กันเอาใบร่างไปใช้เป็นใบจริง
 */
export function buildApDocumentPdfData(
  doc: ApDocument,
  /** ใบตั้งหนี้ที่ใบลดหนี้อ้างถึง — ใช้หามูลค่าเดิมของใบลดหนี้เท่านั้น */
  referenceInvoice?: ApDocument | null,
): SalesCommercialPdfData {
  // ใบลดหนี้ใช้เนื้อหาตามแบบฟอร์มของบริษัท — ใบตั้งหนี้ยังใช้ชุดเดิมด้านล่าง
  if (doc.docType === "CREDIT_NOTE") {
    return buildCreditNotePdfData(doc, referenceInvoice);
  }
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

export async function generateApDocumentPdf(
  doc: ApDocument,
  referenceInvoice?: ApDocument | null,
) {
  if (doc.docType === "DEBIT_NOTE") {
    const { generateApDebitNotePdf } = await import("./generateApDebitNotePdf");
    await generateApDebitNotePdf(doc);
    return;
  }
  await generateSalesCommercialPdf(buildApDocumentPdfData(doc, referenceInvoice));
}
