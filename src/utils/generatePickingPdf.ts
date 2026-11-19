import {
  SALES_ORDER_PAYMENT_METHOD_LABEL,
  type SalesOrderPaymentMethod,
} from "@/types/sales-orders";

import {
  generateSalesCommercialPdf,
  type SalesLinePdfItem,
} from "./pdf-common";

export type PickingPdfLine = SalesLinePdfItem & {
  warehouse?: string;
  location?: string;
  lotNo?: string;
  lineRemark?: string;
};

export type PickingPdfData = {
  pickingNo: string;
  pickingDate: string;
  salesOrderNo: string;
  customerName: string;
  contactName: string;
  paymentMethod: string;
  customerPoNo: string;
  remark: string;
  items: PickingPdfLine[];
};

function paymentMethodLabel(value?: string) {
  const code = value?.trim();
  if (!code) return "";
  return (
    SALES_ORDER_PAYMENT_METHOD_LABEL[code as SalesOrderPaymentMethod] ?? code
  );
}

function placeLine(location?: string, lotNo?: string) {
  return [location, lotNo]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part) && part !== "—")
    .join(" / ");
}

export async function generatePickingPdf(data: PickingPdfData) {
  const sourceWarehouses = [
    ...new Set(
      data.items
        .map((item) => item.warehouse?.trim())
        .filter((code): code is string => Boolean(code) && code !== "—"),
    ),
  ];

  await generateSalesCommercialPdf({
    pageId: "picking-pdf",
    titleTh: "ใบเบิกสินค้า",
    titleEn: "PICKING LIST",
    docNo: data.pickingNo,
    docDate: data.pickingDate,
    infoRows: [],
    infoSections: [
      {
        rows: [
          { label: "คลังต้นทาง", value: sourceWarehouses.join(", ") },
          { label: "ผู้รับสินค้า", value: data.contactName },
        ],
      },
      {
        rows: [
          { label: "ประเภทการจ่าย", value: paymentMethodLabel(data.paymentMethod) },
          { label: "เอกสารอ้างอิง", value: data.salesOrderNo },
        ],
      },
    ],
    columnLabels: {
      no: "ลำดับ",
      code: "รหัสสินค้า",
      name: "สินค้า",
    },
    items: data.items.map((item) => {
      const place = placeLine(item.location, item.lotNo);
      const remark = item.lineRemark?.trim();
      return {
        no: item.no,
        itemCode: item.itemCode,
        itemName: place ? `${item.itemName}\n${place}` : item.itemName,
        unit: item.unit,
        qty: item.qty,
        ...(remark ? { extra: remark } : {}),
      };
    }),
    withPrices: false,
    remark: data.remark,
    signatures: ["ผู้จ่ายสินค้า", "ผู้ตรวจสอบ", "ผู้รับ"],
  });
}
