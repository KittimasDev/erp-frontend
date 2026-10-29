import { escapeHtml, openMultiPagePdfFromHtml } from "./pdf-common";
import { formatThaiBuddhistDate } from "./generateT2900PhotoReceiptPdf";

import type { T2900QualityReport } from "@/types/t2900";

const PAGE_ID = "t2900-quality-report-pdf";
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAD_TOP = 28;
const PAD_BOTTOM = 24;
const PAD_X = 28;
const HEADER_H = 72;
const FOOT_H = 22;
const ROW_H = 26;
const COL_HEAD_H = 28;
const SAFETY = 8;
const CONTENT_H =
  PAGE_HEIGHT - PAD_TOP - PAD_BOTTOM - HEADER_H - FOOT_H - SAFETY;

function styles() {
  return `
    <style>
      .t29q-page, .t29q-page * { box-sizing: border-box; }
      .t29q-page {
        width: ${PAGE_WIDTH}px; height: ${PAGE_HEIGHT}px;
        padding: ${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px; background: #fff;
        font-family: "Sarabun", "Tahoma", "Segoe UI", sans-serif;
        font-size: 12.5px; line-height: 1.35; color: #000; position: relative;
      }
      .t29q-title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 6px; }
      .t29q-sub {
        display: grid; grid-template-columns: 1fr 1fr; gap: 2px 12px;
        font-size: 12px; margin-bottom: 10px;
      }
      .t29q-sub .right { text-align: right; }
      .t29q-table { width: 100%; border-collapse: collapse; }
      .t29q-table th, .t29q-table td {
        border: 1px solid #333; padding: 4px 6px; vertical-align: middle;
      }
      .t29q-table th {
        background: #e8f5e9; font-weight: 700; text-align: center; height: ${COL_HEAD_H}px;
      }
      .t29q-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
      .t29q-table td.ctr { text-align: center; }
      .t29q-empty { padding: 24px; text-align: center; color: #666; }
      .t29q-note { margin-top: 8px; font-size: 11px; color: #a00; }
      .t29q-foot {
        position: absolute; left: ${PAD_X}px; right: ${PAD_X}px; bottom: 10px;
        font-size: 11px; color: #555; display: flex; justify-content: space-between;
      }
    </style>`;
}

function fmtTons(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function rowHtml(row: T2900QualityReport["rows"][number]) {
  return `<tr>
    <td class="ctr">${row.seq}</td>
    <td>${escapeHtml(row.custName || "-")}</td>
    <td class="ctr">${escapeHtml(row.truckNo || "-")}</td>
    <td>${escapeHtml(row.prodName || "-")}</td>
    <td class="num">${fmtTons(row.weightTons)}</td>
    <td>${escapeHtml(row.location || "-")}</td>
  </tr>`;
}

function paginateRows(rowCount: number): number[][] {
  const firstPageCapacity = Math.max(
    1,
    Math.floor((CONTENT_H - COL_HEAD_H) / ROW_H),
  );
  const nextPageCapacity = firstPageCapacity;
  const pages: number[][] = [];
  let index = 0;
  let capacity = firstPageCapacity;
  while (index < rowCount) {
    const end = Math.min(rowCount, index + capacity);
    const page: number[] = [];
    for (let i = index; i < end; i += 1) {
      page.push(i);
    }
    pages.push(page);
    index = end;
    capacity = nextPageCapacity;
  }
  if (pages.length === 0) {
    pages.push([]);
  }
  return pages;
}

export function buildT2900QualityReportPagesHtml(
  report: T2900QualityReport,
  printedAt: string = formatThaiBuddhistDate(new Date().toISOString()),
): string[] {
  const range = `${formatThaiBuddhistDate(report.dateFrom)} - ${formatThaiBuddhistDate(report.dateTo)}`;
  const pages = paginateRows(report.rows.length);
  const notes: string[] = [];
  if (report.truncated) {
    notes.push("รายงานนี้ตัดที่ 5,000 ใบแรก — เลือกช่วงวันที่ให้สั้นลงเพื่อดูครบ");
  }
  if (report.rows.length === 0) {
    notes.push("ไม่พบบัตรชั่งครั้งสองในช่วงวันที่ที่เลือก");
  }

  return pages.map((indices, pageIndex) => {
    const body =
      indices.length === 0
        ? `<div class="t29q-empty">${escapeHtml(notes[0] ?? "ไม่มีข้อมูล")}</div>`
        : `<table class="t29q-table">
            <thead>
              <tr>
                <th style="width:56px">ลำดับที่</th>
                <th>ชื่อลูกค้า</th>
                <th style="width:110px">ทะเบียนรถ</th>
                <th style="width:140px">สินค้า</th>
                <th style="width:90px">น้ำหนัก (ตัน)</th>
                <th style="width:140px">สถานที่</th>
              </tr>
            </thead>
            <tbody>
              ${indices.map((i) => rowHtml(report.rows[i])).join("")}
            </tbody>
          </table>
          ${
            pageIndex === pages.length - 1 && notes.length
              ? notes
                  .map((n) => `<div class="t29q-note">${escapeHtml(n)}</div>`)
                  .join("")
              : ""
          }`;

    return `
      ${pageIndex === 0 ? styles() : ""}
      <div id="${PAGE_ID}-${pageIndex}" class="t29q-page">
        <div class="t29q-title">รายงานคุณภาพสินค้า</div>
        <div class="t29q-sub">
          <div>วันพิมพ์รายงาน ${escapeHtml(printedAt)}</div>
          <div class="right">หน้าที่ ${pageIndex + 1} จาก ${pages.length}</div>
          <div>ช่วงวันที่ : ${escapeHtml(range)}</div>
          <div class="right">จำนวน ${report.rows.length} รายการ</div>
        </div>
        ${body}
        <div class="t29q-foot"><span>รายงานสรุปประจำวัน · รับซื้อยาง</span><span></span></div>
      </div>`;
  });
}

export async function generateT2900QualityReportPdf(report: T2900QualityReport) {
  await openMultiPagePdfFromHtml(
    PAGE_ID,
    buildT2900QualityReportPagesHtml(report),
    {
      wrapperWidth: `${PAGE_WIDTH}px`,
      includeBaseStyles: false,
      orientation: "portrait",
    },
  );
}
