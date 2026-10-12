import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
  type SalesLinePdfItem,
} from "./pdf-common";

export type ReturnNotePdfData = {
  returnNoteNo: string;
  docDate: string;
  statusLabel: string;
  /** ยังไม่อนุมัติ / ไม่อนุมัติ — พิมพ์ป้ายเตือนไว้หัวกระดาษ */
  draftBanner?: string;
  customerName: string;
  salesOrderNo: string;
  deliveryOrderNo: string;
  pickingNo: string;
  reason: string;
  warehouse: string;
  createdBy: string;
  approvedBy: string;
  remark: string;
  items: Array<
    SalesLinePdfItem & {
      lotNo?: string;
      /** ตรวจคัดแยกแล้ว — ว่าง = ยังไม่ตรวจ */
      goodQty?: number;
      scrapQty?: number;
    }
  >;
};

function formatInspectQty(value: number) {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

/**
 * ใบรับคืนสินค้า (TOR Phase 1 ข้อ 5.5 คู่กับใบลดหนี้)
 *
 * Lot ต่อท้ายชื่อสินค้า เพราะคอลัมน์ท้ายของ template กว้างแค่ 80px —
 * คอลัมน์นั้นเก็บไว้ใส่ผลตรวจคัดแยก (ดี/เสีย) ที่สั้นกว่า
 */
export function buildReturnNotePdfData(
  data: ReturnNotePdfData,
): SalesCommercialPdfData {
  return {
    pageId: "return-note-pdf",
    titleTh: "ใบรับคืนสินค้า",
    titleEn: "RETURN NOTE",
    docNo: data.returnNoteNo,
    docDate: data.docDate,
    draftBanner: data.draftBanner,
    infoRows: [
      { label: "ลูกค้า", value: data.customerName, emphasis: true },
      { label: "อ้างอิง SO", value: data.salesOrderNo },
      { label: "ใบส่งสินค้า", value: data.deliveryOrderNo },
      { label: "ใบจ่ายสินค้า", value: data.pickingNo },
      { label: "รับคืนเข้าคลัง", value: data.warehouse },
      { label: "สถานะ", value: data.statusLabel },
      { label: "ผู้จัดทำ", value: data.createdBy },
      { label: "ผู้อนุมัติ", value: data.approvedBy },
      { label: "เหตุผลที่คืน", value: data.reason, full: true },
    ],
    items: data.items.map((item) => ({
      ...item,
      itemName: item.lotNo ? `${item.itemName} · Lot ${item.lotNo}` : item.itemName,
      extra:
        item.goodQty == null && item.scrapQty == null
          ? "ยังไม่ตรวจ"
          : `ดี ${formatInspectQty(item.goodQty ?? 0)} / เสีย ${formatInspectQty(item.scrapQty ?? 0)}`,
    })),
    columnLabels: { qty: "จำนวนคืน", extra: "ผลตรวจ" },
    withPrices: false,
    remark: data.remark,
    signatures: ["ผู้ส่งคืน", "ผู้ตรวจรับ", "ผู้อนุมัติ"],
  };
}

export async function generateReturnNotePdf(data: ReturnNotePdfData) {
  await generateSalesCommercialPdf(buildReturnNotePdfData(data));
}
