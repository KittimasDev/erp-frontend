import dayjs from "dayjs";

import { REPORT_EXPORT_ROW_CAP } from "@/lib/api/sales-reports";
import {
  PAYMENT_STATUS_LABEL,
  STOCK_POSTING_STATUS_LABEL,
  type RawTirePurchaseReportMonthRow,
  type RawTirePurchaseReportRow,
  type RawTirePurchaseReportSummary,
} from "@/types/raw-tire-purchase-reports";
import type { TabularPdfColumn, TabularReport } from "@/utils/downloadTabularReport";

/**
 * แปลงรายงานรับซื้อยาง (รายวัน / รายเดือน) เป็นตารางสำหรับ Excel + CSV + PDF
 *
 * รายงานรวมระดับใบ: น้ำหนักเป็น กก. ล้วนและเงินเป็นบาท จึงไม่มีจำนวนสินค้าหลายหน่วยมาปนกัน
 * (ข้อกำหนด "รายเดือนไม่รวมจำนวนสินค้าที่มีหน่วยต่างกัน" ปฏิบัติตามโดยโครงของรายงานเอง)
 */

export type RawTirePurchaseExportContext = {
  dateFrom?: string;
  dateTo?: string;
  /** ตัวกรองที่ผู้ใช้เลือก เช่น "ผู้ขาย: …" — พิมพ์ลงหัวรายงาน */
  filters: string[];
  summary: RawTirePurchaseReportSummary;
  /** ถูกตัดที่เพดานแถวส่งออก (เฉพาะรายวัน) */
  truncated: boolean;
  total: number;
};

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** 12/09/2569 — วัน/เดือน/ปี พ.ศ. เหมือนรายงานตัวอื่น */
export function formatBeDate(isoDate?: string | null) {
  if (!isoDate) return "";
  const d = dayjs(isoDate);
  if (!d.isValid()) return isoDate;
  return d.format("DD/MM/BBBB");
}

/** "2026-09" → "กันยายน 2569" */
export function formatBeMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  if (!year || !m || m < 1 || m > 12) return month;
  return `${THAI_MONTHS[m - 1]} ${dayjs(new Date(year, m - 1, 1)).format("BBBB")}`;
}

const money = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const sum = (values: Array<string | number | null | undefined>) =>
  values.reduce<number>((acc, value) => acc + (Number(value ?? 0) || 0), 0);

function baseMeta(context: RawTirePurchaseExportContext, mode: "รายวัน" | "รายเดือน") {
  const meta = [
    `รูปแบบ: ${mode}`,
    context.dateFrom && context.dateTo
      ? `ช่วงวันที่ ${formatBeDate(context.dateFrom)} – ${formatBeDate(context.dateTo)}`
      : context.dateFrom
        ? `ตั้งแต่วันที่ ${formatBeDate(context.dateFrom)}`
        : context.dateTo
          ? `ถึงวันที่ ${formatBeDate(context.dateTo)}`
          : "ทุกช่วงวันที่",
    `วันที่ออกรายงาน: ${formatBeDate(dayjs().format("YYYY-MM-DD"))} ${dayjs().format("HH:mm")}`,
    ...context.filters,
    "เฉพาะใบรับซื้อที่ยืนยันแล้ว",
    `รวม ${context.summary.totalReceipts.toLocaleString("th-TH")} ใบ · น้ำหนักสุทธิ ${money(context.summary.totalNetWeightKg)} กก. · ยอดสุทธิ ${money(context.summary.totalAmount)} บาท`,
  ];
  if (context.truncated) {
    meta.push(
      `แสดงเฉพาะ ${REPORT_EXPORT_ROW_CAP.toLocaleString("th-TH")} ใบแรก จากทั้งหมด ${context.total.toLocaleString("th-TH")} ใบ — กรองช่วงวันที่ให้แคบลงเพื่อดูครบ (ยอดรวมด้านบนเป็นของทั้งชุด)`,
    );
  }
  return meta;
}

function stamp(context: RawTirePurchaseExportContext) {
  return context.dateFrom && context.dateTo
    ? `${context.dateFrom}-${context.dateTo}`
    : dayjs().format("YYYY-MM-DD");
}

// ---------- รายวัน ----------

const DAILY_HEADERS = [
  "ลำดับ",
  "เลขที่ใบรับซื้อ",
  "วันที่รับซื้อ",
  "รหัสผู้ขาย",
  "ชื่อผู้ขาย",
  "ทะเบียนรถ",
  "น้ำหนักสุทธิ (กก.)",
  "น้ำหนักหัก (กก.)",
  "น้ำหนักคิดเงิน (กก.)",
  "ยอดก่อนหัก (บาท)",
  "ยอดหัก (บาท)",
  "ยอดสุทธิ (บาท)",
  "สถานะชำระเงิน",
  "สถานะเข้าคลัง",
];

/**
 * รวม 746px — วัดความกว้างจากข้อความจริงด้วย Sarabun ขนาดเดียวกับ PDF
 * คอลัมน์ lead (เลขที่ใบรับซื้อ) มี padding ซ้าย 18px ในแถวรายละเอียด (`tr.detail td.lead`) วัดได้ 106 → เผื่อ 8
 * "เข้าคลังบางส่วน" ต้อง 75 (ไม่มีช่องว่างให้ตัดคำ ถ้าแคบกว่านี้จะหักกลางคำ) ส่วนผู้ขายและทะเบียนรถ
 * มีช่องว่างในข้อความ จึงตกบรรทัดที่ช่องว่างได้ ไม่หักกลางคำ
 */
const DAILY_PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "ลำดับ", cells: [0], width: 36, align: "center" },
  { header: "เลขที่ใบรับซื้อ", cells: [1], width: 108 },
  { header: "วันที่รับซื้อ", cells: [2], width: 82, align: "center" },
  { header: "ผู้ขาย", cells: [3, 4], width: 120 },
  { header: "ทะเบียนรถ", cells: [5], width: 86, align: "center" },
  { header: "น้ำหนักคิดเงิน (กก.)", cells: [8], width: 88, numeric: true },
  { header: "ยอดสุทธิ (บาท)", cells: [11], width: 78, numeric: true },
  { header: "การชำระเงิน", cells: [12], width: 68, align: "center" },
  { header: "สถานะเข้าคลัง", cells: [13], width: 80, align: "center" },
];

function dailyRow(row: RawTirePurchaseReportRow, seq: number): string[] {
  return [
    String(seq),
    row.receiptNo,
    formatBeDate(row.receiptDate),
    row.sellerCode ?? "",
    row.sellerName ?? "",
    row.truckLicensePlate ?? "",
    money(row.netWeightKg),
    money(row.deductionWeightKg),
    money(row.payableWeightKg),
    money(row.subtotalAmount),
    money(row.deductionAmount),
    money(row.totalAmount),
    PAYMENT_STATUS_LABEL[row.paymentStatus] ?? row.paymentStatus,
    STOCK_POSTING_STATUS_LABEL[row.stockPostingStatus] ?? row.stockPostingStatus,
  ];
}

function totalsCells(rows: RawTirePurchaseReportRow[]) {
  return [
    money(sum(rows.map((r) => r.netWeightKg))),
    money(sum(rows.map((r) => r.deductionWeightKg))),
    money(sum(rows.map((r) => r.payableWeightKg))),
    money(sum(rows.map((r) => r.subtotalAmount))),
    money(sum(rows.map((r) => r.deductionAmount))),
    money(sum(rows.map((r) => r.totalAmount))),
  ];
}

/**
 * รายวัน — `grouped: true` (Excel/PDF) แทรกแถวหัววัน + ยอดรวมวัน · `grouped: false` (CSV) เป็นแถวแบน
 * ไม่ปนแถวสรุป จะได้เอาไปประมวลผลต่อได้ · ลำดับนับเฉพาะใบ ต่อเนื่องทั้งไฟล์
 * `rows` เรียงวันที่ใหม่→เก่าอยู่แล้วจาก backend จึงจัดกลุ่มตามลำดับที่เจอ
 */
export function toDailySheet(
  rows: RawTirePurchaseReportRow[],
  context: RawTirePurchaseExportContext,
  grouped: boolean,
): TabularReport {
  const body: string[][] = [];
  const groupRows: number[] = [];
  let seq = 0;
  let index = 0;
  while (index < rows.length) {
    const date = rows[index].receiptDate;
    let end = index;
    while (end < rows.length && rows[end].receiptDate === date) end += 1;
    const dayRows = rows.slice(index, end);
    if (grouped) {
      groupRows.push(body.length);
      body.push([
        "",
        `${dayRows.length.toLocaleString("th-TH")} ใบ`,
        formatBeDate(date),
        "รวมรายวัน",
        "",
        "",
        ...totalsCells(dayRows),
        "",
        "",
      ]);
    }
    for (const row of dayRows) {
      seq += 1;
      body.push(dailyRow(row, seq));
    }
    index = end;
  }

  if (grouped) {
    groupRows.push(body.length);
    // ยอดรวมทั้งหมดใช้ summary จาก backend (ทั้งชุดที่กรอง) — ไม่นับเฉพาะแถวที่ดึงมา เผื่อถูกตัดที่เพดาน
    body.push([
      "",
      `${context.summary.totalReceipts.toLocaleString("th-TH")} ใบ`,
      "",
      "รวมทั้งหมด",
      "",
      "",
      money(context.summary.totalNetWeightKg),
      "",
      "",
      "",
      "",
      money(context.summary.totalAmount),
      "",
      "",
    ]);
  }

  return {
    title: "รายงานรับซื้อรายวัน",
    filename: `raw-tire-purchase-daily-${stamp(context)}`,
    meta: baseMeta(context, "รายวัน"),
    headers: DAILY_HEADERS,
    rows: body,
    groupRows: grouped ? groupRows : undefined,
    pdfColumns: DAILY_PDF_COLUMNS,
  };
}

// ---------- รายเดือน ----------

const MONTHLY_HEADERS = [
  "เดือน",
  "จำนวนใบ",
  "น้ำหนักสุทธิ (กก.)",
  "น้ำหนักหัก (กก.)",
  "น้ำหนักคิดเงิน (กก.)",
  "ยอดก่อนหัก (บาท)",
  "ยอดหัก (บาท)",
  "ยอดสุทธิ (บาท)",
];

/** รวม 746px */
const MONTHLY_PDF_COLUMNS: TabularPdfColumn[] = [
  { header: "เดือน", cells: [0], width: 130 },
  { header: "จำนวนใบ", cells: [1], width: 66, numeric: true },
  { header: "น้ำหนักสุทธิ (กก.)", cells: [2], width: 92, numeric: true },
  { header: "น้ำหนักหัก (กก.)", cells: [3], width: 88, numeric: true },
  { header: "น้ำหนักคิดเงิน (กก.)", cells: [4], width: 96, numeric: true },
  { header: "ยอดก่อนหัก (บาท)", cells: [5], width: 92, numeric: true },
  { header: "ยอดหัก (บาท)", cells: [6], width: 88, numeric: true },
  { header: "ยอดสุทธิ (บาท)", cells: [7], width: 94, numeric: true },
];

export function toMonthlySheet(
  rows: RawTirePurchaseReportMonthRow[],
  context: RawTirePurchaseExportContext,
): TabularReport {
  const body = rows.map((row) => [
    formatBeMonth(row.month),
    row.receiptCount.toLocaleString("th-TH"),
    money(row.netWeightKg),
    money(row.deductionWeightKg),
    money(row.payableWeightKg),
    money(row.subtotalAmount),
    money(row.deductionAmount),
    money(row.totalAmount),
  ]);
  // ยอดรวมท้ายตารางบวกจากแถวรายเดือนที่แสดงอยู่ — เลขตรงกับตารางเสมอ
  const total = [
    "รวมทั้งหมด",
    sum(rows.map((r) => r.receiptCount)).toLocaleString("th-TH"),
    money(sum(rows.map((r) => r.netWeightKg))),
    money(sum(rows.map((r) => r.deductionWeightKg))),
    money(sum(rows.map((r) => r.payableWeightKg))),
    money(sum(rows.map((r) => r.subtotalAmount))),
    money(sum(rows.map((r) => r.deductionAmount))),
    money(sum(rows.map((r) => r.totalAmount))),
  ];
  return {
    title: "รายงานรับซื้อรายเดือน",
    filename: `raw-tire-purchase-monthly-${stamp(context)}`,
    meta: baseMeta({ ...context, truncated: false }, "รายเดือน"),
    headers: MONTHLY_HEADERS,
    rows: [...body, total],
    groupRows: [body.length],
    pdfColumns: MONTHLY_PDF_COLUMNS,
  };
}
