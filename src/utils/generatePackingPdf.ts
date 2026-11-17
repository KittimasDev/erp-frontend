import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type PackingPdfLine = SalesLinePdfItem & {
  lotNo?: string;
  warehouseName?: string;
};

export type PackingPdfData = {
  packingNo: string;
  packingDate: string;
  salesOrderNo: string;
  customerName: string;
  customerAddress: string;
  remark: string;
  items: PackingPdfLine[];
};

function productLot(name: string, lotNo?: string) {
  const lot = lotNo?.trim();
  return lot && lot !== "—" ? `${name} / ${lot}` : name;
}

export async function generatePackingPdf(data: PackingPdfData) {
  const warehouses = [
    ...new Set(
      data.items
        .map((item) => item.warehouseName?.trim())
        .filter((name): name is string => Boolean(name) && name !== "—"),
    ),
  ];

  await generateSalesCommercialPdf({
    pageId: "packing-pdf",
    titleTh: "ใบบรรจุสินค้า",
    titleEn: "PACKING LIST",
    docNo: data.packingNo,
    docDate: data.packingDate,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName },
      { label: "ใบสั่งขายอ้างอิง", value: data.salesOrderNo },
      { label: "คลังสินค้า", value: warehouses.join(", ") },
      { label: "สถานที่จัดส่ง", value: data.customerAddress },
    ],
    columnLabels: {
      no: "ลำดับ",
      code: "รหัสสินค้า",
      name: "สินค้า / Lot",
      qty: "จำนวนบรรจุ",
      unit: "หน่วย",
    },
    items: data.items.map((item) => ({
      no: item.no,
      itemCode: item.itemCode,
      itemName: productLot(item.itemName, item.lotNo),
      unit: item.unit,
      qty: item.qty,
    })),
    withPrices: false,
    remark: data.remark,
    signatures: ["ผู้บรรจุ", "ผู้ตรวจสอบ", "ผู้รับ"],
  });
}
