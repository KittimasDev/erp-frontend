import {
  companyBrandName,
  companyHeaderHtml,
  ensureCompanyInfo,
  escapeHtml,
  openMultiPagePdfFromHtml,
  PDF_PAGE_HEIGHT_PX,
} from "./pdf-common";

const PAGE_ID = "shift-assignments-report";

/**
 * จำนวนแถวต่อหน้า — หน้าแรกเสียพื้นที่ให้การ์ดสรุปกับแถบรายกะ
 *
 * หน้าถูกตรึงความสูงที่ A4 และ overflow ถูกซ่อน แถวที่เกินจะหายไปเงียบๆ
 * ตัวเลขนี้วัดจากของจริง: แถวสูง 37px หน้าแรกเหลือที่ 700px หน้าถัดไป 871px
 * (จุได้ 18 กับ 23) เผื่อไว้หน้าละแถวกันฟอนต์ไทยดันความสูงเกิน
 */
const ROWS_FIRST_PAGE = 17;
const ROWS_NEXT_PAGE = 22;

export type ShiftReportColumn = {
  label: string;
  /** ความกว้างเป็น px บนหน้ากระดาษ 794px (เว้น undefined = ยืดเอง 1 คอลัมน์) */
  width?: number;
  align?: "left" | "center" | "right";
};

export type ShiftReportCell = {
  /** บรรทัดหลัก */
  text: string;
  /** บรรทัดรองตัวเล็กสีจาง เช่น รหัสพนักงาน หรือ ชื่อวัน */
  hint?: string;
  /** สีจุดนำหน้า (ใช้กับคอลัมน์กะ) */
  dot?: string;
  /** ป้ายสถานะท้ายข้อความ */
  badge?: { text: string; tone: "leave" | "pending" | "ot" | "holiday" };
};

export type ShiftReportStat = { label: string; value: string; hint?: string };

export type ShiftAssignmentsPdfData = {
  /** ชื่อรายงานตามมุมมองที่กำลังดูอยู่ */
  title: string;
  titleEn: string;
  periodLabel: string;
  /** ตัวกรองที่เปิดอยู่ตอนสั่งพิมพ์ — ไม่มีก็ไม่ต้องขึ้น */
  filters: Array<{ label: string; value: string }>;
  stats: ShiftReportStat[];
  shiftBreakdown: Array<{ name: string; color?: string; detail: string }>;
  columns: ShiftReportColumn[];
  rows: ShiftReportCell[][];
  /** ข้อความท้ายตาราง เช่น เกณฑ์การนับชั่วโมง */
  footnote?: string;
  printedAt: string;
  printedBy?: string;
};

const BADGE_LABEL: Record<string, string> = {
  leave: "ลา",
  pending: "รออนุมัติ",
  ot: "OT",
  holiday: "วันหยุด",
};

function reportStyles() {
  return `
    <style>
      /*
        ตรึง box-sizing เอง ไม่พึ่ง global reset ของแอป
        ความกว้างคอลัมน์ที่ตั้งไว้ต้องรวม padding ไม่งั้นตารางกว้างเกินหน้ากระดาษ
      */
      .rp-page, .rp-page * { box-sizing: border-box; }
      .rp-page {
        width: 794px;
        height: ${PDF_PAGE_HEIGHT_PX}px;
        box-sizing: border-box;
        padding: 28px 32px 20px;
        background: #fff;
        color: #111827;
        font-family: "Sarabun", "Tahoma", "Segoe UI", sans-serif;
        font-size: 11px;
        line-height: 1.4;
        display: flex;
        flex-direction: column;
        /* กันเนื้อหาที่เกินคาดล้นไปปนกับหน้าถัดไปตอนแคปภาพ */
        overflow: hidden;
      }
      .rp-title-block {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
      }
      .rp-title {
        font-size: 19px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }
      .rp-title-sub {
        margin-top: 2px;
        font-size: 10px;
        color: #6b7280;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .rp-period {
        text-align: right;
        font-size: 11px;
        color: #374151;
      }
      .rp-period strong {
        display: block;
        font-size: 13px;
        color: #111827;
      }
      .rp-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 8px;
        margin-bottom: 12px;
      }
      .rp-filter {
        padding: 3px 9px;
        border: 1px solid #e4e8df;
        border-radius: 999px;
        background: #f4f7ef;
        font-size: 10px;
        color: #374151;
      }
      .rp-filter strong { color: #111827; font-weight: 700; }
      .rp-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        margin-bottom: 10px;
      }
      .rp-stat {
        padding: 8px 10px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: #fcfdfb;
      }
      .rp-stat-label {
        font-size: 9.5px;
        color: #6b7280;
        font-weight: 600;
      }
      .rp-stat-value {
        margin-top: 2px;
        font-size: 16px;
        font-weight: 700;
        color: #111827;
      }
      .rp-stat-hint {
        margin-top: 1px;
        font-size: 9px;
        color: #9ca3af;
      }
      .rp-shifts {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eef0ea;
      }
      .rp-shift {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 10px;
      }
      .rp-shift-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex: 0 0 auto;
      }
      .rp-shift strong { font-weight: 700; }
      .rp-shift span { color: #6b7280; }
      /*
        ตรึงความกว้างเป็น px ตรงๆ (794 - padding ซ้ายขวา 32) แทนการพึ่ง % ใน flex
        ไม่งั้น flex item จะกางตาม min-content ของตารางจนล้นขอบหน้า
      */
      .rp-table-wrap {
        flex: 1 1 auto;
        width: 730px;
        min-width: 0;
        overflow: hidden;
      }
      .rp-table {
        width: 730px;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .rp-table th {
        padding: 6px 7px;
        background: #6f9720;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        text-align: left;
        border-right: 1px solid rgba(255, 255, 255, 0.25);
      }
      .rp-table th:last-child { border-right: 0; }
      .rp-table td {
        padding: 4px 7px;
        border-bottom: 1px solid #eceef0;
        vertical-align: top;
      }
      .rp-table tbody tr:nth-child(even) td { background: #fafbf7; }
      /*
        ตรึงความสูงแถวไว้ เพราะหน้าถูกตรึงที่ A4 และจำนวนแถวต่อหน้าคิดไว้ล่วงหน้า
        ข้อความยาว (ชื่อวันหยุด/หมายเหตุ) ต้องตัดท้าย ไม่ใช่ดันแถวให้สูงจนหน้าล้น
      */
      .rp-cell {
        height: 28px;
        overflow: hidden;
      }
      .rp-cell-text {
        display: block;
        font-size: 10.5px;
        color: #111827;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rp-cell-hint {
        display: block;
        font-size: 9px;
        color: #9ca3af;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .rp-dot {
        display: inline-block;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        margin-right: 5px;
      }
      .rp-badge {
        display: inline-block;
        margin-left: 4px;
        padding: 0 5px;
        border-radius: 4px;
        font-size: 8.5px;
        font-weight: 700;
        line-height: 15px;
      }
      .rp-badge-leave { background: #fde8e6; color: #cf1322; }
      .rp-badge-pending { background: #f1f2f4; color: #6b7280; }
      .rp-badge-ot { background: #fff3d6; color: #ad6800; }
      .rp-badge-holiday { background: #fff2e0; color: #d46b08; }
      .rp-align-center { text-align: center; }
      .rp-align-right { text-align: right; }
      .rp-footnote {
        margin-top: 8px;
        font-size: 9px;
        color: #9ca3af;
      }
      .rp-foot {
        margin-top: auto;
        padding-top: 10px;
        border-top: 1px solid #eef0ea;
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        color: #9ca3af;
      }
    </style>
  `;
}

function cellHtml(cell: ShiftReportCell, align?: string) {
  const alignClass =
    align === "center"
      ? " rp-align-center"
      : align === "right"
        ? " rp-align-right"
        : "";
  const dot = cell.dot
    ? `<span class="rp-dot" style="background:${escapeHtml(cell.dot)}"></span>`
    : "";
  const badge = cell.badge
    ? `<span class="rp-badge rp-badge-${cell.badge.tone}">${escapeHtml(
        cell.badge.text || BADGE_LABEL[cell.badge.tone] || "",
      )}</span>`
    : "";
  const hint = cell.hint
    ? `<span class="rp-cell-hint">${escapeHtml(cell.hint)}</span>`
    : "";
  return `<td class="${alignClass.trim()}"><div class="rp-cell"><span class="rp-cell-text">${dot}${escapeHtml(
    cell.text,
  )}${badge}</span>${hint}</div></td>`;
}

/** แบ่งแถวเป็นหน้า — หน้าแรกได้แถวน้อยกว่าเพราะมีการ์ดสรุปอยู่ด้วย */
function paginate(rowCount: number): Array<[number, number]> {
  if (rowCount === 0) {
    return [[0, 0]];
  }
  const pages: Array<[number, number]> = [];
  let cursor = 0;
  while (cursor < rowCount) {
    const size = pages.length === 0 ? ROWS_FIRST_PAGE : ROWS_NEXT_PAGE;
    pages.push([cursor, Math.min(cursor + size, rowCount)]);
    cursor += size;
  }
  return pages;
}

/**
 * สร้าง HTML ของรายงานทีละหน้า — ฟังก์ชันบริสุทธิ์ ไม่แตะ DOM
 *
 * แยกออกมาจากตัวสั่งพิมพ์เพื่อให้เปิดดู/ตรวจหน้าตารายงานได้โดยไม่ต้องเรนเดอร์ PDF จริง
 */
export function buildShiftReportPagesHtml(
  data: ShiftAssignmentsPdfData,
): string[] {
  const headerCells = data.columns
    .map((column) => {
      const style = column.width ? ` style="width:${column.width}px"` : "";
      const alignClass =
        column.align === "center"
          ? " rp-align-center"
          : column.align === "right"
            ? " rp-align-right"
            : "";
      return `<th class="${alignClass.trim()}"${style}>${escapeHtml(column.label)}</th>`;
    })
    .join("");

  const statsHtml = data.stats
    .map(
      (stat) => `
      <div class="rp-stat">
        <div class="rp-stat-label">${escapeHtml(stat.label)}</div>
        <div class="rp-stat-value">${escapeHtml(stat.value)}</div>
        ${stat.hint ? `<div class="rp-stat-hint">${escapeHtml(stat.hint)}</div>` : ""}
      </div>`,
    )
    .join("");

  const shiftsHtml = data.shiftBreakdown
    .map(
      (shift) => `
      <div class="rp-shift">
        <span class="rp-shift-dot" style="background:${escapeHtml(shift.color || "#8ab933")}"></span>
        <strong>${escapeHtml(shift.name)}</strong>
        <span>${escapeHtml(shift.detail)}</span>
      </div>`,
    )
    .join("");

  const filtersHtml = data.filters
    .map(
      (filter) =>
        `<span class="rp-filter">${escapeHtml(filter.label)} <strong>${escapeHtml(filter.value)}</strong></span>`,
    )
    .join("");

  const pages = paginate(data.rows.length);

  const pagesHtml = pages.map(([start, end], pageIndex) => {
    const isFirst = pageIndex === 0;
    const bodyRows =
      data.rows.length === 0
        ? `<tr><td colspan="${data.columns.length}" class="rp-align-center" style="padding:28px 0;color:#9ca3af">ไม่มีข้อมูลในช่วงที่เลือก</td></tr>`
        : data.rows
            .slice(start, end)
            .map(
              (row) =>
                `<tr>${row
                  .map((cell, index) => cellHtml(cell, data.columns[index]?.align))
                  .join("")}</tr>`,
            )
            .join("");

    return `
      <div id="${PAGE_ID}-${pageIndex}" class="rp-page">
        ${companyHeaderHtml()}
        <div class="rp-title-block">
          <div>
            <div class="rp-title">${escapeHtml(data.title)}</div>
            <div class="rp-title-sub">${escapeHtml(data.titleEn)}</div>
          </div>
          <div class="rp-period">
            <span>ช่วงข้อมูล</span>
            <strong>${escapeHtml(data.periodLabel)}</strong>
          </div>
        </div>
        ${isFirst && filtersHtml ? `<div class="rp-filters">${filtersHtml}</div>` : ""}
        ${isFirst && statsHtml ? `<div class="rp-stats">${statsHtml}</div>` : ""}
        ${isFirst && shiftsHtml ? `<div class="rp-shifts">${shiftsHtml}</div>` : ""}
        <div class="rp-table-wrap">
          <table class="rp-table">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
          ${
            isFirst && data.footnote
              ? `<div class="rp-footnote">${escapeHtml(data.footnote)}</div>`
              : ""
          }
        </div>
        <div class="rp-foot">
          <span>
            พิมพ์ ${escapeHtml(data.printedAt)}${
              data.printedBy ? ` · โดย ${escapeHtml(data.printedBy)}` : ""
            } · ${escapeHtml(companyBrandName())} ERP
          </span>
          <span>หน้า ${pageIndex + 1}/${pages.length}</span>
        </div>
      </div>
    `;
  });

  // สไตล์ของรายงานแนบไปกับหน้าแรก ทุกหน้าอยู่ใน wrapper เดียวกันจึงใช้ร่วมกันได้
  return pagesHtml.map((html, index) =>
    index === 0 ? `${reportStyles()}${html}` : html,
  );
}

export async function generateShiftAssignmentsPdf(
  data: ShiftAssignmentsPdfData,
) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  await openMultiPagePdfFromHtml(PAGE_ID, buildShiftReportPagesHtml(data));
}
