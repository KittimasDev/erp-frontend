import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type SalesOrderPdfData = {
  soNo: string;
  soDate: string;
  customerName: string;
  customerCode: string;
  customerPoNo: string;
  quotationNo: string;
  requestedDeliveryDate: string;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  items: SalesLinePdfItem[];
};

export async function generateSalesOrderPdf(data: SalesOrderPdfData) {
  await generateSalesCommercialPdf({
    pageId: "sales-order-pdf",
    titleTh: "ใบสั่งขาย",
    titleEn: "SALES ORDER",
    docNo: data.soNo,
    docDate: data.soDate,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "รหัสลูกค้า", value: data.customerCode },
      {
        label: "เลข PO ลูกค้า",
        value: data.customerPoNo,
        emphasis: true,
      },
      { label: "อ้างอิง QT", value: data.quotationNo },
      { label: "ต้องการรับ", value: data.requestedDeliveryDate },
    ],
    items: data.items,
    withPrices: true,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    remark: data.remark,
    signatures: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"],
  });
}
