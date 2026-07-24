import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type PackingPdfData = {
  packingNo: string;
  packingDate: string;
  pickingNo: string;
  salesOrderNo: string;
  customerName: string;
  packageType: string;
  packageCount: string;
  remark: string;
  items: SalesLinePdfItem[];
};

export async function generatePackingPdf(data: PackingPdfData) {
  await generateSalesCommercialPdf({
    pageId: "packing-pdf",
    titleTh: "ใบบรรจุสินค้า",
    titleEn: "PACKING LIST",
    docNo: data.packingNo,
    docDate: data.packingDate,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "อ้างอิง SO", value: data.salesOrderNo },
      { label: "อ้างอิง Picking", value: data.pickingNo },
      { label: "ประเภทบรรจุ", value: data.packageType },
      { label: "จำนวนหีบห่อ", value: data.packageCount },
    ],
    items: data.items.map((item) => ({
      ...item,
      extra: item.extra ?? "—",
    })),
    withPrices: false,
    remark: data.remark,
    signatures: ["ผู้บรรจุ", "ผู้ตรวจสอบ", "ผู้รับ"],
  });
}
