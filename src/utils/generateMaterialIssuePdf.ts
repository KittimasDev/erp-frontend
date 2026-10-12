import {
  generateSalesCommercialPdf,
  type SalesCommercialPdfData,
  type SalesLinePdfItem,
} from "./pdf-common";

export type MaterialIssuePdfData = {
  issueNo: string;
  issueDate: string;
  statusLabel: string;
  /** ไม่ใช่ใบที่ตัดสต๊อกแล้ว — พิมพ์ป้ายเตือนไว้หัวกระดาษ */
  draftBanner?: string;
  requestedByName: string;
  issuedByName: string;
  postedAt: string;
  remark: string;
  items: Array<SalesLinePdfItem & { warehouse?: string; lotNo?: string }>;
};

/**
 * ใบเบิกวัตถุดิบเพื่อผลิต (TOR Phase 1 ข้อ 6.1)
 *
 * ไม่พิมพ์เลขใบสั่งผลิต — response ของใบเบิกมีแค่ productionOrderId ไม่มีเลขที่
 * พิมพ์ UUID ลงกระดาษไปก็อ่านไม่รู้เรื่อง
 */
export function buildMaterialIssuePdfData(
  data: MaterialIssuePdfData,
): SalesCommercialPdfData {
  return {
    pageId: "material-issue-pdf",
    titleTh: "ใบเบิกวัตถุดิบเพื่อผลิต",
    titleEn: "MATERIAL ISSUE",
    docNo: data.issueNo,
    docDate: data.issueDate,
    draftBanner: data.draftBanner,
    infoRows: [
      { label: "ผู้ขอเบิก", value: data.requestedByName },
      { label: "ผู้จ่ายของ", value: data.issuedByName },
      { label: "สถานะ", value: data.statusLabel },
      { label: "ตัดสต๊อกเมื่อ", value: data.postedAt },
    ],
    /**
     * Lot ต่อท้ายชื่อสินค้า ไม่ใส่คอลัมน์ท้าย — คอลัมน์ท้ายของ template กว้างแค่ 80px
     * เลข Lot ยาว ๆ จะถูกหักกลางคำจนอ่านไม่ออก (template ใช้ร่วมกับเอกสารอื่น จึงไม่ไปขยายที่นั่น)
     */
    items: data.items.map((item) => ({
      ...item,
      itemName: item.lotNo ? `${item.itemName} · Lot ${item.lotNo}` : item.itemName,
      extra: item.warehouse || "—",
    })),
    columnLabels: { qty: "จำนวนเบิก", extra: "คลัง/ตำแหน่ง" },
    withPrices: false,
    remark: data.remark,
    signatures: ["ผู้ขอเบิก", "ผู้จ่ายของ", "ผู้อนุมัติ"],
  };
}

export async function generateMaterialIssuePdf(data: MaterialIssuePdfData) {
  await generateSalesCommercialPdf(buildMaterialIssuePdfData(data));
}
