import { getUserSignatureDataUrl } from "@/lib/user/user-signature";

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
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  items: SalesLinePdfItem[];
  /** ผู้จัดทำเอกสาร — ถ้ามี id และคนนั้นอัปลายเซ็นไว้ จะเอารูปไปแสดงในช่องเซ็น */
  preparedBy?: { id?: string; name?: string };
};

export async function generateSalesInvoicePdf(data: SalesInvoicePdfData) {
  const preparedSignature = await getUserSignatureDataUrl(data.preparedBy?.id);

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
      { label: "ครบกำหนด", value: data.dueDate },
    ],
    items: data.items,
    withPrices: true,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
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
