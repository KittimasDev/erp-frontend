import { getUserSignatureDataUrl } from "@/lib/user/user-signature";
import { vatAmountLabel } from "@/lib/money/vat-totals";

import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type SalesInvoicePdfData = {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  customerCode: string;
  salesOrderNo: string;
  deliveryOrderNo: string;
  paymentTerm: string;
  vatModeLabel?: string;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  afterDiscount?: number;
  vatAmount: number;
  vatRate?: number;
  totalAmount: number;
  items: SalesLinePdfItem[];
  /** ผู้จัดทำเอกสาร — ถ้ามี id และคนนั้นอัปลายเซ็นไว้ จะเอารูปไปแสดงในช่องเซ็น */
  preparedBy?: { id?: string; name?: string };
};

export async function generateSalesInvoicePdf(data: SalesInvoicePdfData) {
  const preparedSignature = await getUserSignatureDataUrl(data.preparedBy?.id);
  const afterDiscount =
    data.afterDiscount ??
    Math.max(0, data.subtotalAmount - data.discountAmount);

  await generateSalesCommercialPdf({
    pageId: "sales-invoice-pdf",
    titleTh: "ใบแจ้งหนี้",
    titleEn: "SALES INVOICE",
    docNo: data.invoiceNo,
    docDate: data.invoiceDate,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "รหัสลูกค้า", value: data.customerCode },
      { label: "อ้างอิง SO", value: data.salesOrderNo },
      { label: "อ้างอิง DO", value: data.deliveryOrderNo },
      { label: "เงื่อนไขชำระ", value: data.paymentTerm },
      { label: "รูปแบบ VAT", value: data.vatModeLabel || "—" },
      { label: "ครบกำหนด", value: data.dueDate },
    ],
    items: data.items,
    withPrices: true,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    totalsLines: [
      { label: "ยอดรวมก่อนส่วนลด", value: data.subtotalAmount },
      { label: "ส่วนลดท้ายบิล", value: data.discountAmount },
      { label: "ยอดหลังหักส่วนลด", value: afterDiscount },
      { label: vatAmountLabel(data.vatRate), value: data.vatAmount },
      { label: "ยอดสุทธิ", value: data.totalAmount, grand: true },
    ],
    remark: data.remark,
    signatures: [
      {
        title: "ผู้ออกบิล",
        name: data.preparedBy?.name,
        signatureDataUrl: preparedSignature,
      },
      "ผู้ตรวจสอบ",
      "ลูกค้า",
    ],
  });
}
