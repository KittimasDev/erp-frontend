import { getUserSignatureDataUrl } from "@/lib/user/user-signature";

import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfTotalsLine,
  type SalesLinePdfItem,
} from "./pdf-common";

export type SalesQuotationPdfData = {
  quotationNo: string;
  quotationDate: string;
  customerName: string;
  customerCode: string;
  contactName?: string;
  paymentTerm: string;
  validUntil: string;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  afterDiscount?: number;
  vatAmount: number;
  vatRate?: number;
  withholdingAmount?: number;
  withholdingPercent?: number;
  totalAmount: number;
  items: SalesLinePdfItem[];
  preparedBy?: { id?: string; name?: string };
  draftBanner?: string;
};

function quotationTotalsLines(
  data: SalesQuotationPdfData,
): SalesCommercialPdfTotalsLine[] {
  const afterDiscount =
    data.afterDiscount ??
    Math.max(0, data.subtotalAmount - data.discountAmount);
  const vatLabel =
    typeof data.vatRate === "number" && data.vatRate > 0
      ? `ภาษีมูลค่าเพิ่ม ${data.vatRate}%`
      : "ภาษีมูลค่าเพิ่ม";
  const lines: SalesCommercialPdfTotalsLine[] = [
    { label: "ยอดรวมก่อนส่วนลด", value: data.subtotalAmount },
    { label: "ส่วนลดท้ายบิล", value: data.discountAmount },
    { label: "ยอดหลังหักส่วนลด", value: afterDiscount },
    { label: vatLabel, value: data.vatAmount },
  ];
  if ((data.withholdingPercent ?? 0) > 0) {
    lines.push({
      label: `ภาษีหัก ณ ที่จ่าย ${data.withholdingPercent}%`,
      value: data.withholdingAmount ?? 0,
    });
  }
  lines.push({ label: "ยอดสุทธิ", value: data.totalAmount, grand: true });
  return lines;
}

export async function generateSalesQuotationPdf(data: SalesQuotationPdfData) {
  const preparedSignature = await getUserSignatureDataUrl(data.preparedBy?.id);

  await generateSalesCommercialPdf({
    pageId: "sales-quotation-pdf",
    titleTh: "ใบเสนอราคา",
    titleEn: "SALES QUOTATION",
    docNo: data.quotationNo,
    docDate: data.quotationDate,
    draftBanner: data.draftBanner,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "รหัสลูกค้า", value: data.customerCode },
      { label: "ผู้ติดต่อ", value: data.contactName || "—" },
      { label: "เงื่อนไขชำระ", value: data.paymentTerm },
      { label: "ยืนราคาถึงวันที่", value: data.validUntil },
    ],
    items: data.items,
    withPrices: true,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    totalsLines: quotationTotalsLines(data),
    remark: data.remark,
    signatures: [
      {
        title: "ผู้เสนอราคา",
        name: data.preparedBy?.name,
        signatureDataUrl: preparedSignature,
      },
      "ผู้ตรวจสอบ",
      "ลูกค้า",
    ],
  });
}
