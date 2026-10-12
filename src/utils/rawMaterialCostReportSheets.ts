import dayjs from "dayjs";

import { REPORT_EXPORT_ROW_CAP } from "@/lib/api/sales-reports";
import { formatErpDate } from "@/lib/datetime/erp-timezone";
import {
  PRODUCTION_ISSUE_REF_TYPES,
  type RawMaterialCostDetailRow,
  type RawMaterialCostDetailTotals,
  type RawMaterialCostSummaryRow,
  type RawMaterialCostSummaryTotals,
} from "@/types/raw-material-cost-report";
import { STOCK_MOVEMENT_TYPE_LABEL, resolveStockMovementTypeLabel } from "@/types/inventory";
import type { TabularPdfColumn, TabularReport } from "@/utils/downloadTabularReport";
import { formatBeDate } from "@/utils/rawTirePurchaseReportSheets";

/**
 * แปลงรายงานต้นทุนวัตถุดิบ (สรุป / รายละเอียด) เป็นตารางสำหรับ Excel + CSV + PDF
 * ตัวเลขทุกตัวมาจาก backend (amount ที่บันทึกใน stock_movements) — ที่นี่แค่จัดรูปแบบ
 */

export type RawMaterialCostExportContext = {
  dateFrom: string;
  dateTo: string;
  /** ตัวกรองที่ผู้ใช้เลือก เช่น "คลัง: …" — พิมพ์ลงหัวรายงาน */
  filters: string[];
  /** ถูกตัดที่เพดานแถวส่งออก (เฉพาะรายละเอียด) */
  truncated?: boolean;
  total?: number;
  /** ลำดับแรกของไฟล์ — ส่งออกทั้งชุดเริ่มที่ 1 */
  firstSeq?: number;
};

export const money = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const qty = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

/** ต้นทุนต่อหน่วยเก็บ 4 ตำแหน่งในระบบ — โชว์ 2 ถึง 4 ตำแหน่ง ไม่ปัดทิ้งจนสูญเสียความละเอียด */
export const unitCost = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });

const sum = (values: Array<string | number | null | undefined>) =>
  values.reduce<number>((acc, value) => acc + (Number(value ?? 0) || 0), 0);

/** ประเภทรายการที่แสดง — ISSUE ที่มาจากการผลิตแสดงเป็น "เบิกไปผลิต" */
export function detailTypeLabel(row: {
  movementType: string;
  referenceDocType?: string;
}) {
  const ref = (row.referenceDocType ?? "").toUpperCase();
  if (
    row.movementType?.toUpperCase() === "ISSUE" &&
    (PRODUCTION_ISSUE_REF_TYPES as readonly string[]).includes(ref)
  ) {
    return "เบิกไปผลิต";
  }
  return resolveStockMovementTypeLabel(row) || STOCK_MOVEMENT_TYPE_LABEL[row.movementType];
}

/** เลขเอกสารอ้างอิง — รับซื้อยางโชว์ทั้ง SPR และ RP เพื่อค้น/ตรวจย้อนกลับได้ทั้งสองเลข */
export function detailDocLabel(row: RawMaterialCostDetailRow) {
  const doc = row.referenceDocNo ?? "";
  if (row.purchaseReceiptNo && row.purchaseReceiptNo !== doc) {
    return doc ? `${doc} (${row.purchaseReceiptNo})` : row.purchaseReceiptNo;
  }
  return doc;
}

function baseMeta(context: RawMaterialCostExportContext, tab: string) {
  const meta = [
    `แท็บ: ${tab}`,
    `ช่วงวันที่ ${formatBeDate(context.dateFrom)} – ${formatBeDate(context.dateTo)}`,
    `วันที่ออกรายงาน: ${formatBeDate(dayjs().format("YYYY-MM-DD"))} ${dayjs().format("HH:mm")}`,
    ...context.filters,
    "สินค้าหมวด RAW_MATERIAL · ต้นทุนตามที่บันทึก ณ วันเกิดรายการ",
  ];
  if (context.truncated) {
    meta.push(
      `แสดงเฉพาะ ${REPORT_EXPORT_ROW_CAP.toLocaleString("th-TH")} รายการแรก จากทั้งหมด ${(context.total ?? 0).toLocaleString("th-TH")} รายการ — กรองช่วงวันที่ให้แคบลงเพื่อดูครบ (ยอดรวมท้ายตารางเป็นของทั้งชุด)`,
    );
  }
  return meta;
}

const stamp = (context: RawMaterialCostExportContext) =>
  `${context.dateFrom}-${context.dateTo}`;

// ---------- แท็บสรุป ----------

const SUMMARY_HEADERS = [
  "ลำดับ",
  "รหัสสินค้า",
  "ชื่อสินค้า",
  "จำนวนยกมา (KG)",
  "มูลค่าต้นทุนยกมา (บาท)",
  "ต้นทุนรับเข้า (บาท)",
  "ต้นทุนเบิกออก (บาท)",
  "มูลค่าปรับปรุงสุทธิ (บาท)",
  "จำนวนคงเหลือ (KG)",
  "ต้นทุนเฉลี่ยคงเหลือ (บาท/KG)",
  "มูลค่าคงเหลือ (บาท)",
];

/** รวม 746px — ปรับตามการวัดข้อความจริงด้วย Sarabun ตอนตรวจ PDF */
const SUMMARY_PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "ลำดับ", cells: [0], width: 30, align: "center" },
  { header: "รหัสสินค้า", cells: [1], width: 76 },
  { header: "ชื่อสินค้า", cells: [2], width: 86 },
  { header: "ยกมา (KG)", cells: [3], width: 68, numeric: true },
  { header: "ยกมา (บาท)", cells: [4], width: 72, numeric: true },
  { header: "รับเข้า (บาท)", cells: [5], width: 74, numeric: true },
  { header: "เบิกออก (บาท)", cells: [6], width: 70, numeric: true },
  { header: "ปรับปรุง (บาท)", cells: [7], width: 72, numeric: true },
  { header: "คงเหลือ (KG)", cells: [8], width: 68, numeric: true },
  { header: "เฉลี่ย/KG", cells: [9], width: 52, numeric: true },
  { header: "คงเหลือ (บาท)", cells: [10], width: 78, numeric: true },
];

/** ชื่อสินค้า — ต่อหน่วยท้ายชื่อเมื่อไม่ใช่ KG กันตัวเลขหน่วยอื่นดูเหมือนเป็น KG */
export function summaryItemName(row: Pick<RawMaterialCostSummaryRow, "itemName" | "unitCode">) {
  const unit = (row.unitCode ?? "").toUpperCase();
  return unit && unit !== "KG" ? `${row.itemName} (${row.unitCode})` : row.itemName;
}

/** จำนวนรวมท้ายตาราง — รวมได้เมื่อทุกแถวหน่วยเดียวกัน ไม่งั้นเว้นว่าง (ไม่รวมหน่วยต่างกัน) */
export function summaryQuantityTotals(items: RawMaterialCostSummaryRow[]) {
  const units = new Set(items.map((row) => row.unitCode));
  if (items.length === 0 || units.size !== 1) return null;
  const openingQty = sum(items.map((r) => r.openingQty));
  const closingQty = sum(items.map((r) => r.closingQty));
  return { openingQty, closingQty };
}

export function toSummarySheet(
  items: RawMaterialCostSummaryRow[],
  totals: RawMaterialCostSummaryTotals,
  context: RawMaterialCostExportContext,
): TabularReport {
  const rows = items.map((row, index) => [
    String(index + 1),
    row.itemCode,
    summaryItemName(row),
    qty(row.openingQty),
    money(row.openingValue),
    money(row.receivedValue),
    money(row.issuedValue),
    money(row.adjustedValue),
    qty(row.closingQty),
    unitCost(row.closingAvgCost),
    money(row.closingValue),
  ]);
  const quantities = summaryQuantityTotals(items);
  const closingValue = Number(totals.closingValue);
  rows.push([
    "",
    "",
    "รวมทั้งหมด",
    quantities ? qty(quantities.openingQty) : "",
    money(totals.openingValue),
    money(totals.receivedValue),
    money(totals.issuedValue),
    money(totals.adjustedValue),
    quantities ? qty(quantities.closingQty) : "",
    quantities && quantities.closingQty > 0
      ? unitCost(closingValue / quantities.closingQty)
      : "",
    money(totals.closingValue),
  ]);
  return {
    title: "รายงานต้นทุนวัตถุดิบ — สรุปต้นทุน",
    filename: `raw-material-cost-summary-${stamp(context)}`,
    meta: baseMeta(context, "สรุปต้นทุนวัตถุดิบ"),
    headers: SUMMARY_HEADERS,
    rows,
    groupRows: [rows.length - 1],
    pdfColumns: SUMMARY_PDF_COLUMNS,
  };
}

// ---------- แท็บรายละเอียด ----------

const DETAIL_HEADERS = [
  "ลำดับ",
  "วันที่ทำรายการ",
  "ประเภทรายการ",
  "เลขที่เอกสารอ้างอิง",
  "รหัสสินค้า",
  "ชื่อสินค้า",
  "Lot",
  "คลังสินค้า",
  "จำนวนเข้า (KG)",
  "จำนวนออก (KG)",
  "ต้นทุนต่อหน่วย (บาท/KG)",
  "ต้นทุนรวม (บาท)",
];

const DETAIL_PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "ลำดับ", cells: [0], width: 26, align: "center" },
  { header: "วันที่", cells: [1], width: 60, align: "center" },
  { header: "ประเภท", cells: [2], width: 66 },
  { header: "เลขที่เอกสาร", cells: [3], width: 106 },
  { header: "สินค้า", cells: [4, 5], width: 78 },
  { header: "Lot", cells: [6], width: 114 },
  { header: "คลัง", cells: [7], width: 56 },
  { header: "เข้า (KG)", cells: [8], width: 66, numeric: true },
  { header: "ออก (KG)", cells: [9], width: 56, numeric: true },
  { header: "บาท/KG", cells: [10], width: 50, numeric: true },
  { header: "ต้นทุนรวม", cells: [11], width: 68, numeric: true },
];

export function toDetailSheet(
  items: RawMaterialCostDetailRow[],
  totals: RawMaterialCostDetailTotals,
  context: RawMaterialCostExportContext,
): TabularReport {
  const rows = items.map((row, index) => {
    const isIn = Number(row.quantityIn) > 0;
    return [
      String((context.firstSeq ?? 1) + index),
      formatErpDate(row.movementDate, ""),
      detailTypeLabel(row),
      detailDocLabel(row),
      row.itemCode,
      row.itemNameTh,
      row.lotNo ?? "",
      row.warehouseName,
      isIn ? qty(row.quantityIn) : "",
      !isIn ? qty(row.quantityOut) : "",
      unitCost(row.unitCost),
      money(row.amount),
    ];
  });
  // ยอดรวมของทั้งชุดที่กรอง (ไม่ใช่เฉพาะแถวที่ส่งออก) — แยกรับเข้า/เบิกออก ไม่หักกลบกัน
  const totalStart = rows.length;
  rows.push(
    ["", "", "รวมรับเข้า", "", "", "", "", "", qty(totals.totalQuantityIn), "", "", money(totals.totalCostIn)],
    ["", "", "รวมเบิกออก", "", "", "", "", "", "", qty(totals.totalQuantityOut), "", money(totals.totalCostOut)],
  );
  return {
    title: "รายงานต้นทุนวัตถุดิบ — รายละเอียดรายการเคลื่อนไหว",
    filename: `raw-material-cost-detail-${stamp(context)}`,
    meta: baseMeta(context, "รายละเอียดต้นทุนวัตถุดิบ"),
    headers: DETAIL_HEADERS,
    rows,
    groupRows: [totalStart, totalStart + 1],
    pdfColumns: DETAIL_PDF_COLUMNS,
  };
}
