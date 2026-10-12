import dayjs from "dayjs";

import { REPORT_EXPORT_ROW_CAP } from "@/lib/api/sales-reports";
import {
  AGING_BUCKET_LABEL,
  type ArAgingRow,
  type ArAgingSummary,
  type SalesInvoiceSummaryRow,
  type SalesPaymentReportRow,
} from "@/types/sales-reports";
import {
  SALES_INVOICE_PAYMENT_METHOD_LABEL,
  SALES_INVOICE_PAYMENT_STATUS_LABEL,
  SALES_INVOICE_STATUS_LABEL,
} from "@/types/sales-invoices";
import type { TabularPdfColumn, TabularReport } from "@/utils/downloadTabularReport";

/**
 * แปลงรายงานลูกหนี้ / ใบแจ้งหนี้ / รับชำระ เป็นตารางสำหรับ Excel + PDF
 *
 * หัวคอลัมน์ยึดตาม CSV ที่ backend สร้าง (`reports.service.ts`) ไฟล์ทุกแบบจะได้คอลัมน์เดียวกัน
 * ต่างกันแค่ CSV พิมพ์รหัสดิบ (UNPAID, 31_60) ส่วนสองแบบนี้แปลงเป็นป้ายภาษาไทยให้อ่านได้
 *
 * แถว "รวม" บวกจากแถวที่อยู่ในตารางเอง ไม่ใช้ summary ของ backend — summary ของรายงานลูกหนี้
 * นับใบแจ้งหนี้ที่ชำระครบแล้วด้วย ถ้าเอามาวางใต้ตารางที่มีแต่ใบค้าง เลขจะไม่ตรงกับแถวข้างบน
 */

export type SalesReportExportContext = {
  dateFrom?: string;
  dateTo?: string;
  /** ตัวกรองอื่นที่ผู้ใช้เลือก เช่น "ลูกค้า: บริษัท ก" — พิมพ์ลงหัวรายงาน */
  filters: string[];
  total: number;
  truncated: boolean;
};

/** 01/10/2569 — วัน/เดือน/ปี พ.ศ. เหมือนรายงานตัวอื่น */
function formatBeDate(isoDate?: string | null) {
  if (!isoDate) return "";
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  return `${d.format("DD/MM/")}${d.year() + 543}`;
}

function formatMoney(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sum(values: Array<string | number | null | undefined>) {
  return values.reduce<number>((acc, value) => acc + (Number(value ?? 0) || 0), 0);
}

function baseMeta(context: SalesReportExportContext, unit: string) {
  const meta = [
    context.dateFrom && context.dateTo
      ? `ช่วงวันที่ ${formatBeDate(context.dateFrom)} – ${formatBeDate(context.dateTo)}`
      : "ทุกช่วงวันที่",
    `วันที่ออกรายงาน: ${formatBeDate(dayjs().format("YYYY-MM-DD"))} ${dayjs().format("HH:mm")}`,
    ...context.filters,
    `จำนวน ${context.total.toLocaleString("th-TH")} ${unit}`,
  ];
  if (context.truncated) {
    meta.push(
      `แสดงเฉพาะ ${REPORT_EXPORT_ROW_CAP.toLocaleString("th-TH")} รายการแรก — กรองช่วงวันที่ให้แคบลงเพื่อดูครบทุกรายการ`,
    );
  }
  return meta;
}

function stamp(context: SalesReportExportContext) {
  return context.dateFrom && context.dateTo
    ? `${context.dateFrom}-${context.dateTo}`
    : dayjs().format("YYYY-MM-DD");
}

// ---------- รายงานลูกหนี้คงค้าง (P1.7.7) ----------

const AR_HEADERS = [
  "เลขที่ใบแจ้งหนี้",
  "วันที่ออกใบแจ้งหนี้",
  "ครบกำหนด",
  "รหัสลูกค้า",
  "ชื่อลูกค้า",
  "ยอดรวม",
  "ชำระแล้ว",
  "คงค้าง",
  "สถานะชำระเงิน",
  "อายุหนี้",
];

/**
 * รวม 746px — ความกว้างวัดจากข้อความจริงด้วย Sarabun ขนาดเดียวกับ PDF (ข้อมูล 9.5px, ตัวเลข 9px + padding 12px)
 * วันที่ 62 · SI-20260727-004 84 · "ยังไม่ครบกำหนด" 76 · "ชำระบางส่วน" 64 · เงินหลักสิบล้าน 69
 * ต่ำกว่านี้วันที่จะตกบรรทัดเป็น "01/09/256" + "9"
 *
 * คอลัมน์ข้อความแรกที่ไม่จัดกลาง (lead) ได้ padding ซ้าย 18px ในแถวรายละเอียด แทน 6px
 * (`tabularReportPdf.ts` `tr.detail td.lead`) — จึงต้องกว้างกว่าที่วัดอีก 12px: เลขที่ใบแจ้งหนี้ 84 → 96
 * แล้วเผื่ออีก 8px: วัดใน DOM แล้ว 96 พอดีเป๊ะ แต่ตอนเรนเดอร์เป็น PDF ยังล้นไปนิดเดียวจนตกบรรทัด
 */
const AR_PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "เลขที่ใบแจ้งหนี้", cells: [0], width: 104 },
  { header: "วันที่ออก", cells: [1], width: 64, align: "center" },
  { header: "ครบกำหนด", cells: [2], width: 64, align: "center" },
  { header: "ลูกค้า", cells: [3, 4], width: 148 },
  { header: "ยอดรวม", cells: [5], width: 74, numeric: true },
  { header: "ชำระแล้ว", cells: [6], width: 74, numeric: true },
  { header: "คงค้าง", cells: [7], width: 74, numeric: true },
  { header: "สถานะชำระ", cells: [8], width: 66, align: "center" },
  { header: "อายุหนี้", cells: [9], width: 78, align: "center" },
];

export function toArAgingSheet(
  rows: ArAgingRow[],
  summary: ArAgingSummary,
  context: SalesReportExportContext,
): TabularReport {
  const body = rows.map((row) => [
    row.invoiceNo,
    formatBeDate(row.invoiceDate),
    formatBeDate(row.dueDate),
    row.customerCode ?? "",
    row.customerName ?? "",
    formatMoney(row.totalAmount),
    formatMoney(row.paidAmount),
    formatMoney(row.outstandingAmount),
    SALES_INVOICE_PAYMENT_STATUS_LABEL[row.paymentStatus] ?? row.paymentStatus,
    AGING_BUCKET_LABEL[row.agingBucket] ?? row.agingBucket,
  ]);
  const totalRow = [
    "รวม",
    "",
    "",
    "",
    "",
    formatMoney(sum(rows.map((r) => r.totalAmount))),
    formatMoney(sum(rows.map((r) => r.paidAmount))),
    formatMoney(sum(rows.map((r) => r.outstandingAmount))),
    "",
    "",
  ];
  return {
    title: "รายงานลูกหนี้คงค้าง",
    filename: `ar-aging-report-${stamp(context)}`,
    meta: [
      ...baseMeta(context, "ใบ"),
      `ยอดค้างตามอายุหนี้: ยังไม่ครบกำหนด ${formatMoney(summary.notDueAmount)} · 1-30 วัน ${formatMoney(summary.bucket1To30)} · 31-60 วัน ${formatMoney(summary.bucket31To60)} · 61-90 วัน ${formatMoney(summary.bucket61To90)} · เกิน 90 วัน ${formatMoney(summary.bucketOver90)} บาท`,
    ],
    headers: AR_HEADERS,
    rows: [...body, totalRow],
    groupRows: [body.length],
    pdfColumns: AR_PDF_COLUMNS,
  };
}

// ---------- รายงานใบแจ้งหนี้ขาย (P1.7.4 สมุดรายวันขาย) ----------

const INVOICE_HEADERS = [
  "เลขที่ใบแจ้งหนี้",
  "วันที่ออกใบแจ้งหนี้",
  "รหัสลูกค้า",
  "ชื่อลูกค้า",
  "เลขที่ใบสั่งขาย",
  "เลขที่ใบส่งสินค้า",
  "ยอดรวม",
  "ชำระแล้ว",
  "คงค้าง",
  "สถานะเอกสาร",
  "สถานะชำระเงิน",
];

/**
 * รวม 746px — วัดแบบเดียวกับรายงานลูกหนี้ ("แบบร่างเอกสาร" ต้องการ 74)
 * เลข SO กับ DO รวมไว้ช่องเดียว (ซ้อน 2 บรรทัด) — แยกกันแล้วช่องลูกค้าเหลือแค่ 60px
 * Excel/CSV ยังแยกเป็นคนละคอลัมน์ตามเดิม
 */
const INVOICE_PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "เลขที่ใบแจ้งหนี้", cells: [0], width: 104 },
  { header: "วันที่ออก", cells: [1], width: 64, align: "center" },
  { header: "ลูกค้า", cells: [2, 3], width: 126 },
  { header: "SO / ใบส่งสินค้า", cells: [4, 5], width: 96 },
  { header: "ยอดรวม", cells: [6], width: 72, numeric: true },
  { header: "ชำระแล้ว", cells: [7], width: 72, numeric: true },
  { header: "คงค้าง", cells: [8], width: 72, numeric: true },
  { header: "สถานะ", cells: [9], width: 74, align: "center" },
  { header: "การชำระ", cells: [10], width: 66, align: "center" },
];

export function toSalesInvoiceSheet(
  rows: SalesInvoiceSummaryRow[],
  context: SalesReportExportContext,
): TabularReport {
  const body = rows.map((row) => [
    row.invoiceNo,
    formatBeDate(row.invoiceDate),
    row.customerCode ?? "",
    row.customerName ?? "",
    row.salesOrderNo ?? "",
    row.deliveryOrderNo ?? "",
    formatMoney(row.totalAmount),
    formatMoney(row.paidAmount),
    formatMoney(row.outstandingAmount),
    SALES_INVOICE_STATUS_LABEL[row.status] ?? row.status,
    row.paymentStatus
      ? (SALES_INVOICE_PAYMENT_STATUS_LABEL[row.paymentStatus] ?? row.paymentStatus)
      : "",
  ]);
  const totalRow = [
    "รวม",
    "",
    "",
    "",
    "",
    "",
    formatMoney(sum(rows.map((r) => r.totalAmount))),
    formatMoney(sum(rows.map((r) => r.paidAmount))),
    formatMoney(sum(rows.map((r) => r.outstandingAmount))),
    "",
    "",
  ];
  return {
    title: "รายงานใบแจ้งหนี้ขาย",
    filename: `sales-invoice-summary-report-${stamp(context)}`,
    meta: baseMeta(context, "ใบ"),
    headers: INVOICE_HEADERS,
    rows: [...body, totalRow],
    groupRows: [body.length],
    pdfColumns: INVOICE_PDF_COLUMNS,
  };
}

// ---------- รายงานรับชำระเงิน (P1.7.5 สมุดรายวันรับ) ----------

const PAYMENT_HEADERS = [
  "วันที่รับชำระ",
  "เลขที่ใบแจ้งหนี้",
  "รหัสลูกค้า",
  "ชื่อลูกค้า",
  "จำนวนเงิน",
  "วิธีรับชำระ",
  "เลขอ้างอิง",
  "ผู้บันทึก",
];

/** รวม 746px — เลขที่ใบแจ้งหนี้เป็นคอลัมน์ lead (วันที่จัดกลาง) จึงต้องเผื่อ padding ซ้าย 18px */
const PAYMENT_PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "วันที่รับชำระ", cells: [0], width: 64, align: "center" },
  { header: "เลขที่ใบแจ้งหนี้", cells: [1], width: 104 },
  { header: "ลูกค้า", cells: [2, 3], width: 182 },
  { header: "จำนวนเงิน", cells: [4], width: 90, numeric: true },
  { header: "วิธีรับชำระ", cells: [5], width: 84, align: "center" },
  { header: "เลขอ้างอิง", cells: [6], width: 118 },
  { header: "ผู้บันทึก", cells: [7], width: 104 },
];

export function toSalesPaymentSheet(
  rows: SalesPaymentReportRow[],
  context: SalesReportExportContext,
): TabularReport {
  const body = rows.map((row) => [
    formatBeDate(row.paymentDate.slice(0, 10)),
    row.invoiceNo,
    row.customerCode ?? "",
    row.customerName ?? "",
    formatMoney(row.amount),
    SALES_INVOICE_PAYMENT_METHOD_LABEL[row.paymentMethod] ?? row.paymentMethod,
    row.transactionRef ?? "",
    row.createdByName ?? "",
  ]);
  const totalRow = [
    "รวม",
    "",
    "",
    "",
    formatMoney(sum(rows.map((r) => r.amount))),
    "",
    "",
    "",
  ];
  return {
    title: "รายงานรับชำระเงิน",
    filename: `sales-payment-report-${stamp(context)}`,
    meta: baseMeta(context, "รายการ"),
    headers: PAYMENT_HEADERS,
    rows: [...body, totalRow],
    groupRows: [body.length],
    pdfColumns: PAYMENT_PDF_COLUMNS,
  };
}
