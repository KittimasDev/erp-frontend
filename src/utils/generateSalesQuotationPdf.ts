import { getUserSignatureDataUrl } from "@/lib/user/user-signature";
import { withholdingTaxTypeLabel } from "@/lib/money/vat-totals";

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
  customerTaxId?: string;
  customerAddress?: string;
  customerPhone?: string;
  contactName?: string;
  paymentTerm: string;
  taxRateLabel?: string;
  withholdingLabel?: string;
  validUntil: string;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  afterDiscount?: number;
  vatAmount: number;
  vatRate?: number;
  withholdingAmount?: number;
  withholdingPercent?: number;
  withholdingTaxType?: string;
  totalAmount: number;
  items: SalesLinePdfItem[];
  preparedBy?: { id?: string; name?: string };
  preparedByPhone?: string;
  draftBanner?: string;
};

function dash(value?: string) {
  const text = value?.trim();
  return text ? text : "—";
}

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
  const withholdingLabel =
    data.withholdingLabel?.trim() ||
    withholdingTaxTypeLabel(data.withholdingTaxType, data.withholdingPercent);
  const taxRateLabel =
    data.taxRateLabel?.trim() ||
    (typeof data.vatRate === "number" && data.vatRate > 0
      ? `ภาษีมูลค่าเพิ่ม ${data.vatRate}%`
      : "—");

  await generateSalesCommercialPdf({
    pageId: "sales-quotation-pdf",
    titleTh: "ใบเสนอราคา",
    docNo: data.quotationNo,
    docDate: data.quotationDate,
    draftBanner: data.draftBanner,
    infoRows: [],
    infoSections: [
      {
        title: "ข้อมูลลูกค้า",
        rows: [
          { label: "ลูกค้า", value: dash(data.customerName) },
          { label: "รหัสลูกค้า", value: dash(data.customerCode) },
          { label: "เลขที่ผู้เสียภาษี", value: dash(data.customerTaxId) },
          { label: "ที่อยู่", value: dash(data.customerAddress) },
          { label: "เบอร์โทร", value: dash(data.customerPhone) },
          { label: "ผู้ติดต่อ", value: dash(data.contactName) },
        ],
      },
      {
        title: "การชำระเงินและการจัดส่ง",
        rows: [
          { label: "เงื่อนไขการชำระเงิน", value: dash(data.paymentTerm) },
          { label: "อัตราภาษี", value: dash(taxRateLabel) },
          { label: "ภาษีหัก ณ ที่จ่าย", value: dash(withholdingLabel) },
          { label: "วันหมดอายุ", value: dash(data.validUntil) },
          { label: "ผู้เสนอราคา", value: dash(data.preparedBy?.name) },
          { label: "เบอร์โทรผู้เสนอราคา", value: dash(data.preparedByPhone) },
        ],
      },
    ],
    items: data.items,
    withPrices: true,
    columnLabels: { no: "ลำดับ" },
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    totalsLines: quotationTotalsLines(data),
    remark: data.remark,
    remarkIsHtml: true,
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
