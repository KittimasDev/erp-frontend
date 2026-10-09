import dayjs from "dayjs";

import type { TabularPdfColumn, TabularReport } from "./downloadTabularReport";
import {
  escapeHtml,
  openMultiPagePdfFromHtml,
  PDF_PAGE_HEIGHT_PX,
} from "./pdf-common";

const PAGE_ID = "tabular-report-pdf";
const PAGE_WIDTH = 794;
const PAD_TOP = 20;
const PAD_X = 24;
const PAD_BOTTOM = 14;
const TABLE_WIDTH = PAGE_WIDTH - PAD_X * 2;
/** เผื่อหน้าละนิด กันฟอนต์ไทยตอนแคปภาพสูงกว่าตอนวัด — หน้าซ่อน overflow แถวที่เกินจะหายเงียบ */
const SAFETY_PX = 6;
/** ค่าลบจริงเท่านั้น — "–" (en dash) ที่ใช้แทนค่าว่างไม่นับ */
const NEGATIVE = /^-\d/;

/**
 * จัดแถวลงหน้า: แถวไม่ถูกตัดข้ามหน้า และไม่ทิ้งแถวสรุปไว้ท้ายหน้าโดยแยกจากรายละเอียดของมัน
 * คืน [start, end) ต่อหน้า — ไม่มีแถวเลยได้ 1 หน้าว่าง
 */
export function paginateRows(
  rowHeights: number[],
  groupRows: Set<number>,
  firstBudget: number,
  nextBudget: number,
): Array<[number, number]> {
  const pages: Array<[number, number]> = [];
  let start = 0;
  while (start < rowHeights.length) {
    const budget = pages.length === 0 ? firstBudget : nextBudget;
    let end = start;
    let used = 0;
    // หน้าละอย่างน้อย 1 แถว แม้แถวเดียวจะสูงเกินงบ ไม่งั้นวนไม่จบ
    while (
      end < rowHeights.length &&
      (end === start || used + rowHeights[end] <= budget)
    ) {
      used += rowHeights[end];
      end += 1;
    }
    const last = end - 1;
    if (
      end < rowHeights.length &&
      end - start > 1 &&
      groupRows.has(last) &&
      !groupRows.has(end)
    ) {
      end = last;
    }
    pages.push([start, end]);
    start = end;
  }
  return pages.length ? pages : [[0, 0]];
}

function resolveColumns(report: TabularReport): TabularPdfColumn[] {
  if (report.pdfColumns?.length) return report.pdfColumns;
  const width = Math.floor(TABLE_WIDTH / Math.max(report.headers.length, 1));
  return report.headers.map((header, index) => ({
    header,
    cells: [index],
    width,
  }));
}

/** คอลัมน์ข้อความแรก (ไม่ใช่ลำดับ/ตัวเลข) — แถวรายละเอียดเยื้องที่คอลัมน์นี้ */
function leadColumnIndex(columns: TabularPdfColumn[]) {
  return columns.findIndex((col) => !col.numeric && col.align !== "center");
}

function cellHtml(
  row: string[],
  column: TabularPdfColumn,
  isLead: boolean,
): string {
  const parts = column.cells
    .map((index) => row[index] ?? "")
    .filter((value) => value.trim() !== "");
  const classes: string[] = [];
  if (isLead) classes.push("lead");
  if (column.align === "center") classes.push("c");
  if (column.align === "right") classes.push("r");

  let content: string;
  if (column.numeric) {
    const value = parts.join(" ");
    classes.push("num");
    if (NEGATIVE.test(value.trim())) classes.push("neg");
    content = escapeHtml(value);
  } else if (parts.length > 1) {
    const [code, ...rest] = parts;
    content = `<span class="code">${escapeHtml(code)}</span> ${escapeHtml(rest.join(" "))}`;
  } else {
    content = escapeHtml(parts[0] ?? "");
  }
  return `<td${classes.length ? ` class="${classes.join(" ")}"` : ""}>${content}</td>`;
}

function styles() {
  return `
    <style>
      .tr-page, .tr-page * { box-sizing: border-box; }
      .tr-page {
        width: ${PAGE_WIDTH}px;
        height: ${PDF_PAGE_HEIGHT_PX}px;
        padding: ${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px;
        background: #fff;
        color: #111827;
        font-family: "Sarabun", "Tahoma", "Segoe UI", sans-serif;
        font-size: 9.5px;
        line-height: 1.3;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .tr-page.tr-measure { height: auto; overflow: visible; }
      .tr-head { padding-bottom: 8px; }
      .tr-title { font-size: 15px; font-weight: 600; }
      .tr-meta { margin-top: 2px; color: #4b5563; }
      .tr-head-next { font-size: 10px; font-weight: 600; color: #4b5563; }
      .tr-body { flex: 1 1 auto; min-height: 0; }
      .tr-table {
        width: ${TABLE_WIDTH}px;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .tr-table th,
      .tr-table td {
        border: 1px solid #e5e7eb;
        padding: 3px 5px;
        text-align: left;
        vertical-align: top;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .tr-table th {
        background: #f3f6ee;
        font-weight: 600;
        vertical-align: bottom;
      }
      .tr-table .c { text-align: center; }
      .tr-table .r { text-align: right; }
      .tr-table td.num {
        text-align: right;
        white-space: nowrap;
        overflow-wrap: normal;
        word-break: normal;
        padding: 3px 4px;
        font-size: 9px;
        font-variant-numeric: tabular-nums;
      }
      .tr-table tr.group td {
        background: #eef4e4;
        font-weight: 600;
        border-top: 1px solid #9ca3af;
      }
      .tr-table tr.detail td { color: #4b5563; }
      .tr-table tr.detail td.lead { padding-left: 17px; }
      .tr-table td.neg,
      .tr-table tr.detail td.neg { color: #dc2626; }
      .tr-table .code { font-weight: 600; color: #111827; }
      .tr-table td.tr-empty {
        text-align: center;
        color: #9ca3af;
        padding: 24px 0;
      }
      .tr-foot {
        display: flex;
        justify-content: space-between;
        padding-top: 6px;
        font-size: 8.5px;
        color: #6b7280;
      }
    </style>`;
}

type PageParts = {
  firstHead: string;
  nextHead: string;
  table: (bodyRows: string) => string;
  foot: (pageNo: number, total: number) => string;
  rows: string[];
};

function buildParts(report: TabularReport): PageParts {
  const columns = resolveColumns(report);
  const lead = leadColumnIndex(columns);
  const groupRows = new Set(report.groupRows ?? []);
  const printedAt = dayjs().format("DD/MM/YYYY HH:mm");

  const colgroup = `<colgroup>${columns
    .map((col) => `<col style="width:${col.width}px">`)
    .join("")}</colgroup>`;
  const head = columns
    .map((col) => {
      const align = col.numeric ? "r" : col.align === "center" ? "c" : "";
      return `<th${align ? ` class="${align}"` : ""}>${escapeHtml(col.header)}</th>`;
    })
    .join("");
  const rows = report.rows.map(
    (row, index) =>
      `<tr class="${groupRows.has(index) ? "group" : "detail"}">${columns
        .map((col, colIndex) => cellHtml(row, col, colIndex === lead))
        .join("")}</tr>`,
  );
  const meta = (report.meta ?? []).map(escapeHtml).join(" · ");

  return {
    firstHead: `<div class="tr-head"><div class="tr-title">${escapeHtml(report.title)}</div>${
      meta ? `<div class="tr-meta">${meta}</div>` : ""
    }</div>`,
    nextHead: `<div class="tr-head tr-head-next">${escapeHtml(report.title)} (ต่อ)</div>`,
    table: (bodyRows) =>
      `<div class="tr-body"><table class="tr-table">${colgroup}<thead><tr>${head}</tr></thead><tbody>${
        bodyRows ||
        `<tr><td class="tr-empty" colspan="${columns.length}">ไม่มีข้อมูล</td></tr>`
      }</tbody></table></div>`,
    foot: (pageNo, total) =>
      `<div class="tr-foot"><span>พิมพ์ ${escapeHtml(printedAt)}</span><span>หน้า ${pageNo}/${total}</span></div>`,
    rows,
  };
}

/** วาดทุกแถวในหน้าซ่อนที่ไม่จำกัดความสูง แล้ววัดของจริงด้วยสไตล์เดียวกัน */
async function measure(parts: PageParts) {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = `${PAGE_WIDTH}px`;
  host.innerHTML = `${styles()}<div class="tr-page tr-measure">${parts.firstHead}${parts.nextHead}${parts.table(
    parts.rows.join(""),
  )}${parts.foot(1, 1)}</div>`;
  document.body.appendChild(host);
  try {
    await document.fonts?.ready;
    const height = (selector: string) =>
      host.querySelector(selector)?.getBoundingClientRect().height ?? 0;
    const rowHeights = Array.from(
      host.querySelectorAll(".tr-table tbody tr"),
    ).map((tr) => tr.getBoundingClientRect().height);
    const content = PDF_PAGE_HEIGHT_PX - PAD_TOP - PAD_BOTTOM - SAFETY_PX;
    const common = height(".tr-table thead") + height(".tr-foot");
    return {
      rowHeights: parts.rows.length ? rowHeights : [],
      firstBudget: content - common - height(".tr-head:not(.tr-head-next)"),
      nextBudget: content - common - height(".tr-head-next"),
    };
  } finally {
    document.body.removeChild(host);
  }
}

export async function openTabularReportPdf(report: TabularReport) {
  const parts = buildParts(report);
  const { rowHeights, firstBudget, nextBudget } = await measure(parts);
  const pages = paginateRows(
    rowHeights,
    new Set(report.groupRows ?? []),
    firstBudget,
    nextBudget,
  );

  const pagesHtml = pages.map(([start, end], index) => {
    const html = `<div id="${PAGE_ID}-${index}" class="tr-page">${
      index === 0 ? parts.firstHead : parts.nextHead
    }${parts.table(parts.rows.slice(start, end).join(""))}${parts.foot(
      index + 1,
      pages.length,
    )}</div>`;
    // สไตล์แนบกับหน้าแรก ทุกหน้าอยู่ใน wrapper เดียวกันจึงใช้ร่วมกันได้
    return index === 0 ? `${styles()}${html}` : html;
  });

  await openMultiPagePdfFromHtml(PAGE_ID, pagesHtml, {
    includeBaseStyles: false,
  });
}
