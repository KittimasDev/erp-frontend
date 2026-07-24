import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type PickingPdfData = {
  pickingNo: string;
  pickingDate: string;
  salesOrderNo: string;
  customerName: string;
  remark: string;
  items: Array<SalesLinePdfItem & { warehouse?: string; lotNo?: string }>;
};

export async function generatePickingPdf(data: PickingPdfData) {
  await generateSalesCommercialPdf({
    pageId: "picking-pdf",
    titleTh: "ใบจ่ายสินค้า",
    titleEn: "PICKING LIST",
    docNo: data.pickingNo,
    docDate: data.pickingDate,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "อ้างอิง SO", value: data.salesOrderNo },
    ],
    items: data.items.map((item) => ({
      ...item,
      extra: [item.warehouse, item.lotNo].filter(Boolean).join(" / ") || "—",
    })),
    withPrices: false,
    remark: data.remark,
    signatures: ["ผู้จ่ายสินค้า", "ผู้ตรวจสอบ", "ผู้รับ"],
  });
}
