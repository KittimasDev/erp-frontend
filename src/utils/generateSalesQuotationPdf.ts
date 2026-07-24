import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type SalesQuotationPdfData = {
  quotationNo: string;
  quotationDate: string;
  customerName: string;
  customerCode: string;
  paymentTerm: string;
  validUntil: string;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  items: SalesLinePdfItem[];
};

export async function generateSalesQuotationPdf(data: SalesQuotationPdfData) {
  await generateSalesCommercialPdf({
    pageId: "sales-quotation-pdf",
    titleTh: "ใบเสนอราคา",
    titleEn: "SALES QUOTATION",
    docNo: data.quotationNo,
    docDate: data.quotationDate,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "รหัสลูกค้า", value: data.customerCode },
      { label: "เงื่อนไขชำระ", value: data.paymentTerm },
      { label: "ใช้ได้ถึง", value: data.validUntil },
    ],
    items: data.items,
    withPrices: true,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    remark: data.remark,
    signatures: ["ผู้เสนอราคา", "ผู้ตรวจสอบ", "ลูกค้า"],
  });
}
