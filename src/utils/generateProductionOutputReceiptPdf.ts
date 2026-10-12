import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
  type SalesCommercialPdfInfoRow,
} from "./pdf-common";

export type ProductionOutputReceiptPdfData = {
  requestNo: string;
  postingDate: string;
  statusLabel: string;
  /** ยังไม่เข้าคลัง / ไม่อนุมัติ / ยกเลิก — พิมพ์ป้ายเตือนไว้หัวกระดาษ */
  draftBanner?: string;
  productionOrderNo: string;
  /** เลขที่เอกสารอ้างอิง เช่น ตั๋วชั่ง — ว่างได้ */
  referenceNos: string[];
  /** ใบเบิกวัตถุดิบที่ผูกกับผลผลิตนี้ — ว่างได้ */
  materialIssueNos: string[];
  warehouse: string;
  location: string;
  lotNo: string;
  requestedBy: string;
  approvedBy: string;
  remark: string;
  item: {
    itemCode: string;
    itemName: string;
    unit: string;
    qty: number;
  };
};

/**
 * ใบรับสินค้าจากการผลิต (TOR Phase 1 ข้อ 6.2)
 *
 * ในระบบคือ "คำขอรับผลผลิตเข้าคลัง" — 1 ใบ = สินค้า 1 รายการ
 */
export function buildProductionOutputReceiptPdfData(
  data: ProductionOutputReceiptPdfData,
): SalesCommercialPdfData {
  const infoRows: SalesCommercialPdfInfoRow[] = [
    { label: "ใบสั่งผลิต", value: data.productionOrderNo },
    { label: "สถานะ", value: data.statusLabel },
    { label: "รับเข้าคลัง", value: data.warehouse },
    { label: "ตำแหน่ง", value: data.location },
    { label: "Lot", value: data.lotNo },
    { label: "ผู้ขอ", value: data.requestedBy },
    { label: "ผู้อนุมัติ", value: data.approvedBy },
  ];
  if (data.referenceNos.length) {
    infoRows.push({ label: "เอกสารอ้างอิง", value: data.referenceNos.join(", "), full: true });
  }
  if (data.materialIssueNos.length) {
    infoRows.push({
      label: "ใบเบิกวัตถุดิบ",
      value: data.materialIssueNos.join(", "),
      full: true,
    });
  }

  return {
    pageId: "production-output-receipt-pdf",
    titleTh: "ใบรับสินค้าจากการผลิต",
    titleEn: "PRODUCTION RECEIPT",
    docNo: data.requestNo,
    docDate: data.postingDate,
    draftBanner: data.draftBanner,
    infoRows,
    items: [{ no: 1, ...data.item }],
    columnLabels: { qty: "จำนวนรับเข้า" },
    withPrices: false,
    remark: data.remark,
    signatures: ["ผู้ส่งมอบ (ฝ่ายผลิต)", "ผู้รับเข้าคลัง", "ผู้อนุมัติ"],
  };
}

export async function generateProductionOutputReceiptPdf(
  data: ProductionOutputReceiptPdfData,
) {
  await generateSalesCommercialPdf(buildProductionOutputReceiptPdfData(data));
}
