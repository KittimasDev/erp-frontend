import { escapeHtml, openMultiPagePdfFromHtml } from "./pdf-common";
import { formatThaiBuddhistDate } from "./generateT2900PhotoReceiptPdf";

import type {
  T2900DailyReport,
  T2900DailyReportCustomer,
  T2900DailyReportProduct,
  T2900DailyReportRow,
  T2900DailyReportTotals,
} from "@/types/t2900";

/**
 * รายงานรายวัน "รายงานบัตรชั่งครั้งสอง แยกตามสินค้า" — หน้าตาตามใบต้นฉบับของระบบเดิม
 * (ตัวหนังสือล้วน แถบเขียวเฉพาะหัวคอลัมน์ ป้ายรวมขีดเส้นใต้ เส้นประเหนือรวมย่อย เส้นหนาเหนือรวมสินค้า)
 */
const PAGE_ID = "t2900-daily-report-pdf";
/** A4 แนวนอนที่ 1123×794px — ต้องตรึงทั้งคู่ เพราะ openMultiPagePdfFromHtml วางภาพเต็มหน้า */
const PAGE_WIDTH = 1123;
const PAGE_HEIGHT = 794;
const PAD_TOP = 24;
const PAD_BOTTOM = 18;
const PAD_X = 34;
const HEADER_H = 88;
const FOOT_H = 24;
/** เผื่อกันฟอนต์ไทยดันความสูงเกินค่าที่คำนวณเล็กน้อย */
const SAFETY = 8;
const CONTENT_H =
  PAGE_HEIGHT - PAD_TOP - PAD_BOTTOM - HEADER_H - FOOT_H - SAFETY;

/** รหัสฟอร์มของรายงานนี้ (มุมล่างขวาตามใบต้นฉบับ) */
const FORM_CODE = "FP-WHO-01-04 Rev.01";
const TIME_RANGE = "00:00:00 - 23:59:59";

/** ความสูงของแต่ละชนิดแถว (px) — ตรึงไว้เพื่อให้ตัดหน้าได้แม่น ช่องว่างต้องนับรวมอยู่ในนี้ */
const BAND_H = 30;
const H = {
  product: 30,
  customerHead: 26,
  row: 25,
  subtotal: 32,
  /** รวมสินค้า: แถวสูง PTOTAL_ROW แล้วเว้นว่างด้านล่างก่อนสินค้าถัดไป */
  productTotal: 54,
  end: 36,
  note: 16,
} as const;
const CUSTOMER_H = H.customerHead + BAND_H;
const PTOTAL_ROW = 36;

type Item =
  | { kind: "product"; product: T2900DailyReportProduct; cont?: boolean }
  | {
      kind: "customer";
      product: T2900DailyReportProduct;
      customer: T2900DailyReportCustomer;
      cont?: boolean;
    }
  | {
      kind: "row";
      product: T2900DailyReportProduct;
      customer: T2900DailyReportCustomer;
      row: T2900DailyReportRow;
    }
  | {
      kind: "subtotal";
      product: T2900DailyReportProduct;
      customer: T2900DailyReportCustomer;
    }
  | { kind: "productTotal"; product: T2900DailyReportProduct }
  | { kind: "end" };

function itemHeight(item: Item): number {
  switch (item.kind) {
    case "product":
      return H.product;
    case "customer":
      return CUSTOMER_H;
    case "row":
      return H.row;
    case "subtotal":
      return H.subtotal;
    case "productTotal":
      return H.productTotal;
    case "end":
      return H.end;
  }
}

/** ตัดข้อความยาวเกินช่อง (ไม่พึ่ง overflow:hidden) */
function clip(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function fmtInt(value: number) {
  return value.toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function fmtMoney(value: number | null) {
  if (value === null) {
    return "-";
  }
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPrice(row: T2900DailyReportRow) {
  if (row.pricePerKg === null) {
    return "-";
  }
  const text = row.pricePerKg.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  // ราคามาจากกฎราคา ERP ไม่ได้มากับบัตรชั่ง — ติดดอกจันอ้างอิงหมายเหตุท้ายรายงาน
  return row.priceSource === "PRICE_RULE" ? `${text}*` : text;
}

/** เรียงรายการทั้งรายงานเป็นแถวตรง ๆ: สินค้า → ลูกค้า → บัตร → รวมย่อย → รวมสินค้า → จำนวนทั้งหมด */
function flatten(report: T2900DailyReport): Item[] {
  const items: Item[] = [];
  for (const product of report.products) {
    items.push({ kind: "product", product });
    for (const customer of product.customers) {
      items.push({ kind: "customer", product, customer });
      for (const row of customer.rows) {
        items.push({ kind: "row", product, customer, row });
      }
      items.push({ kind: "subtotal", product, customer });
    }
    items.push({ kind: "productTotal", product });
  }
  items.push({ kind: "end" });
  return items;
}

/** ป้ายสินค้า/ลูกค้าห้ามค้างท้ายหน้าเดี่ยว ๆ — ต้องมีรายการถัดไปตามลงหน้าเดียวกัน */
function keepWithNextHeight(items: Item[], index: number): number {
  const item = items[index];
  if (item.kind === "product") {
    return CUSTOMER_H + H.row;
  }
  if (item.kind === "customer") {
    return H.row;
  }
  return 0;
}

/** ป้าย (ต่อ) ที่ต้องขึ้นหัวหน้าใหม่เมื่อตัดหน้ากลางกลุ่ม */
function continuationItems(first: Item): Item[] {
  if (first.kind === "row" || first.kind === "subtotal") {
    return [
      { kind: "product", product: first.product, cont: true },
      {
        kind: "customer",
        product: first.product,
        customer: first.customer,
        cont: true,
      },
    ];
  }
  if (first.kind === "customer" && !first.cont) {
    return [{ kind: "product", product: first.product, cont: true }];
  }
  if (first.kind === "productTotal") {
    return [{ kind: "product", product: first.product, cont: true }];
  }
  return [];
}

function paginate(items: Item[], noteCount: number): Item[][] {
  const pages: Item[][] = [];
  let current: Item[] = [];
  let used = 0;
  const endExtra = noteCount * H.note;

  items.forEach((item, index) => {
    const height = itemHeight(item) + (item.kind === "end" ? endExtra : 0);
    const need = height + keepWithNextHeight(items, index);
    if (current.length > 0 && used + need > CONTENT_H) {
      pages.push(current);
      current = [];
      used = 0;
    }
    if (current.length === 0) {
      for (const cont of continuationItems(item)) {
        current.push(cont);
        used += itemHeight(cont);
      }
    }
    current.push(item);
    used += height;
  });
  if (current.length > 0) {
    pages.push(current);
  }
  return pages;
}

function styles() {
  return `
    <style>
      .t29d-page, .t29d-page * { box-sizing: border-box; }
      .t29d-page {
        width: ${PAGE_WIDTH}px; height: ${PAGE_HEIGHT}px;
        padding: ${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px; background: #fff; color: #111827;
        font-family: "Sarabun", "Tahoma", "Segoe UI", sans-serif; font-size: 12.5px; line-height: 1.3;
        position: relative;
      }

      /* หัวรายงาน: ชื่อกลางหน้า เส้นใต้ แล้วแถววันพิมพ์ / ชื่อรายงาน / ช่วงวันที่ / เลขหน้า เส้นใต้อีกเส้น */
      .t29d-head { height: ${HEADER_H}px; }
      .t29d-title { height: 32px; line-height: 32px; text-align: center; font-size: 18px; font-weight: 700; border-bottom: 1px solid #111827; }
      .t29d-sub { height: 28px; line-height: 28px; display: grid; grid-template-columns: 200px 1fr 440px 90px; font-size: 12px; border-bottom: 1px solid #111827; }
      .t29d-sub .mid { text-align: center; }
      .t29d-sub .range { text-align: right; white-space: nowrap; }
      .t29d-sub .pg { text-align: right; white-space: nowrap; }

      .t29d-cols, .t29d-row, .t29d-sub-row {
        display: grid;
        grid-template-columns: 85px 116px 85px 105px 70px 70px 95px 95px 95px 70px 105px 64px;
      }
      /* ห้ามตั้ง overflow:hidden ที่ช่อง — html2canvas ตัดตามกล่องช่อง ทำให้สระบน/วรรณยุกต์/หางตัวไทยที่ยื่นเกินบรรทัดถูกตัด */
      .t29d-cols > div, .t29d-row > div, .t29d-sub-row > div { padding: 0 6px; white-space: nowrap; }
      .t29d-r { text-align: right; }
      .t29d-c { text-align: center; }

      /* ป้ายสินค้า / ลูกค้า: ตัวหนังสือล้วน ไม่มีพื้นสี */
      .t29d-product { height: ${H.product}px; line-height: ${H.product}px; padding-top: 6px; font-size: 13.5px; font-weight: 700; }
      .t29d-product span + span, .t29d-chead span + span { margin-left: 28px; }
      .t29d-product .cont, .t29d-chead .cont { font-weight: 400; margin-left: 14px; }
      .t29d-chead { height: ${H.customerHead}px; line-height: ${H.customerHead}px; font-size: 13.5px; font-weight: 700; }
      /* แถบเขียวหัวคอลัมน์ (ขึ้นใต้ป้ายลูกค้าทุกราย) */
      .t29d-cols { height: ${BAND_H}px; background: #c9dd8f; font-weight: 700; font-size: 12.5px; }
      .t29d-cols > div { height: ${BAND_H}px; line-height: ${BAND_H}px; }

      /* แถวบัตร: ตัวหนังสือล้วน ไม่มีเส้นแบ่ง ไม่มีพื้น */
      .t29d-row { height: ${H.row}px; font-size: 12.5px; }
      .t29d-row > div { height: ${H.row}px; line-height: ${H.row}px; }
      .t29d-row .num { font-variant-numeric: tabular-nums; }

      /* รวมย่อยลูกค้า: เส้นประด้านบน ป้ายขีดเส้นใต้เยื้องเข้ามา */
      .t29d-sub-row { height: ${H.subtotal}px; border-top: 1px dashed #111827; font-weight: 700; }
      .t29d-sub-row > div { height: ${H.subtotal}px; line-height: ${H.subtotal}px; }
      .t29d-sub-row .lbl { grid-column: 1 / span 6; padding-left: 100px; text-decoration: underline; }
      /* รวมสินค้า: เส้นหนาด้านบน เส้นบางด้านล่าง ป้ายขีดเส้นใต้ แล้วเว้นว่างก่อนสินค้าถัดไป */
      .t29d-ptotal { height: ${H.productTotal}px; }
      .t29d-ptotal-row { height: ${PTOTAL_ROW}px; border-top: 2px solid #111827; border-bottom: 1px solid #111827; font-weight: 700; }
      .t29d-ptotal-row > div { height: ${PTOTAL_ROW - 3}px; line-height: ${PTOTAL_ROW - 3}px; }
      .t29d-ptotal-row .lbl { grid-column: 1 / span 6; padding-left: 0; text-decoration: underline; }
      .t29d-end { height: ${H.end}px; line-height: ${H.end}px; font-size: 13px; }
      .t29d-note { height: ${H.note}px; line-height: ${H.note}px; font-size: 11px; color: #4b5563; }
      .t29d-warn { color: #b45309; font-weight: 600; }

      /* ท้ายหน้า: เส้นหนา + รหัสฟอร์มมุมขวา */
      .t29d-foot { position: absolute; left: ${PAD_X}px; right: ${PAD_X}px; bottom: ${PAD_BOTTOM}px; height: ${FOOT_H}px; border-top: 2px solid #111827; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10.5px; color: #6b7280; }
    </style>`;
}

function totalsCells(totals: T2900DailyReportTotals) {
  return `
      <div class="t29d-r num">${fmtInt(totals.grossWt)}</div>
      <div class="t29d-r num">${fmtInt(totals.truckWt)}</div>
      <div class="t29d-r num">${fmtInt(totals.netWt)}</div>
      <div></div>
      <div class="t29d-r num">${fmtMoney(totals.amount)}</div>
      <div></div>`;
}

function itemHtml(item: Item, report: T2900DailyReport, noteLines: string[]) {
  switch (item.kind) {
    case "product":
      return `<div class="t29d-product"><span>รหัสสินค้า: ${escapeHtml(item.product.prodId || "-")}</span><span>ชื่อสินค้า: ${escapeHtml(item.product.prodName || "-")}</span>${item.cont ? '<span class="cont">(ต่อ)</span>' : ""}</div>`;
    case "customer":
      return `<div>
        <div class="t29d-chead"><span>รหัสลูกค้า: ${escapeHtml(item.customer.custId || "-")}</span><span>ชื่อลูกค้า: ${escapeHtml(item.customer.custName || "-")}</span>${item.cont ? '<span class="cont">(ต่อ)</span>' : ""}</div>
        <div class="t29d-cols">
          <div>เลขบัตร</div><div>ชื่อสถานที่</div><div>วันที่</div><div>ทะเบียนรถ</div>
          <div>เวลาเข้า</div><div>เวลาออก</div>
          <div class="t29d-r">น้ำหนักรวม</div><div class="t29d-r">น้ำหนักรถ</div><div class="t29d-r">น้ำหนักสุทธิ</div>
          <div class="t29d-r">ราคา/กก.</div><div class="t29d-r">รวมเป็นเงิน</div><div class="t29d-c">ซื้อ/ขาย</div>
        </div>
      </div>`;
    case "row": {
      const row = item.row;
      return `<div class="t29d-row">
        <div>${escapeHtml(row.tckNo)}</div>
        <div>${escapeHtml(clip(row.location || "", 14))}</div>
        <div>${escapeHtml(formatThaiBuddhistDate(row.dateOut))}</div>
        <div>${escapeHtml(clip(row.truckNo, 13))}</div>
        <div>${escapeHtml(row.timeIn)}</div>
        <div>${escapeHtml(row.timeOut)}</div>
        <div class="t29d-r num">${fmtInt(row.grossWt)}</div>
        <div class="t29d-r num">${fmtInt(row.truckWt)}</div>
        <div class="t29d-r num">${fmtInt(row.netWt)}</div>
        <div class="t29d-r num">${escapeHtml(fmtPrice(row))}</div>
        <div class="t29d-r num">${fmtMoney(row.amount)}</div>
        <div class="t29d-c">${escapeHtml(row.tradeType)}</div>
      </div>`;
    }
    case "subtotal":
      return `<div class="t29d-sub-row"><div class="lbl">รวมย่อยลูกค้ารายนี้</div>${totalsCells(item.customer.subtotal)}</div>`;
    case "productTotal":
      return `<div class="t29d-ptotal"><div class="t29d-row t29d-ptotal-row"><div class="lbl">รวมทั้งหมดสำหรับสินค้านี้</div>${totalsCells(item.product.total)}</div></div>`;
    case "end":
      return `<div class="t29d-end">จำนวนข้อมูลทั้งหมด ${fmtInt(report.grand.count)} รายการ</div>${noteLines
        .map((line) => `<div class="t29d-note">${line}</div>`)
        .join("")}`;
  }
}

export function buildT2900DailyReportPagesHtml(
  report: T2900DailyReport,
  printedAt: string = formatThaiBuddhistDate(new Date().toISOString()),
): string[] {
  const noteLines: string[] = [];
  if (report.hasRulePrice) {
    noteLines.push("* ราคามาจากตารางราคารับซื้อของ ERP (ไม่ได้มากับบัตรชั่ง)");
  }
  if (report.truncated) {
    noteLines.push(
      '<span class="t29d-warn">รายงานนี้ตัดที่ 5,000 ใบแรก — เลือกช่วงวันที่ให้สั้นลงเพื่อดูครบ</span>',
    );
  }
  if (report.grand.count === 0) {
    noteLines.push("ไม่พบบัตรชั่งครั้งสองในช่วงวันที่ที่เลือก");
  }

  const items = flatten(report);
  const pages = paginate(items, noteLines.length);
  const range = `${formatThaiBuddhistDate(report.dateFrom)} - ${formatThaiBuddhistDate(report.dateTo)}`;

  return pages.map(
    (pageItems, pageIndex) => `
    ${pageIndex === 0 ? styles() : ""}
    <div id="${PAGE_ID}-${pageIndex}" class="t29d-page">
      <div class="t29d-head">
        <div class="t29d-title">รายงานบัตรชั่งครั้งสอง แยกตามสินค้า</div>
        <div class="t29d-sub">
          <div>วันพิมพ์รายงาน ${escapeHtml(printedAt)}</div>
          <div class="mid">รายงานบัตรชั่งครั้งสอง</div>
          <div class="range">ช่วงวันที่ : ${escapeHtml(range)} &nbsp; ช่วงเวลา ${TIME_RANGE}</div>
          <div class="pg">หน้าที่ ${pageIndex + 1} จาก ${pages.length}</div>
        </div>
      </div>
      ${pageItems.map((item) => itemHtml(item, report, noteLines)).join("")}
      <div class="t29d-foot"><span>ออกจากระบบ ERP · บัตรชั่ง T2900</span><span>${FORM_CODE}</span></div>
    </div>`,
  );
}

/** Export รายงานรายวัน (รายงานบัตรชั่งครั้งสอง แยกตามสินค้า) เป็น PDF แนวนอน เปิดในแท็บใหม่ */
export async function generateT2900DailyReportPdf(report: T2900DailyReport) {
  await openMultiPagePdfFromHtml(
    PAGE_ID,
    buildT2900DailyReportPagesHtml(report),
    {
      wrapperWidth: `${PAGE_WIDTH}px`,
      includeBaseStyles: false,
      orientation: "landscape",
    },
  );
}
