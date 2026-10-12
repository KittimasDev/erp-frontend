import dayjs from "dayjs";

import type { TabularPdfColumn, TabularReport } from "./downloadTabularReport";
import {
  companyBrandName,
  companyHeaderHtml,
  ensureCompanyInfo,
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
 * จัดแถวลงหน้า: แถวไม่ถูกตัดข้ามหน้า และไม่ทิ้งแถวหัวกลุ่มไว้ท้ายหน้าโดยแยกจากแถวในกลุ่มของมัน
 * (หัวกลุ่มซ้อนกัน เช่น ลูกค้า → SO ยกไปหน้าใหม่ด้วยกัน)
 * คืน [start, end) ต่อหน้า — ไม่มีแถวเลยได้ 1 หน้าว่าง
 */
export function paginateRows(
  rowHeights: number[],
  groupRows: Set<number>,
  firstBudget: number,
  nextBudget: number,
  subGroupRows: Set<number> = new Set(),
): Array<[number, number]> {
  // ชั้นของแถว: สรุป 1 → กลุ่มย่อย 2 → รายละเอียด 3 · แถวที่ชั้นน้อยกว่าแถวถัดไปคือหัวของแถวนั้น
  const level = (index: number) =>
    groupRows.has(index) ? 1 : subGroupRows.has(index) ? 2 : 3;
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
    while (
      end < rowHeights.length &&
      end - start > 1 &&
      level(end - 1) < level(end)
    ) {
      end -= 1;
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
  isFirst: boolean,
): string {
  const parts = column.cells
    .map((index) => row[index] ?? "")
    .filter((value) => value.trim() !== "");
  const classes: string[] = [];
  // แถบสีของหัวกลุ่มต้องเกาะขอบซ้ายจริงของแถว ไม่ใช่คอลัมน์ข้อความแรก
  // (รายงานที่มีคอลัมน์ "ลำดับ" นำหน้า แถบจะไปโผล่กลางแถว)
  if (isFirst) classes.push("first");
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
        color: #1f2430;
        font-family: "Sarabun", "Tahoma", "Segoe UI", sans-serif;
        font-size: 9.5px;
        line-height: 1.35;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .tr-page.tr-measure { height: auto; overflow: visible; }

      /* ───── หัวจดหมายบริษัท (หน้าแรก) ─────
         ใช้ companyHeaderHtml() ร่วมกับเอกสารใบอื่น แต่สไตล์เขียนเองเพราะ
         รายงานชุดนี้ไม่ได้โหลด basePdfStyles() (includeBaseStyles: false) */
      .tr-head { padding-bottom: 10px; }
      .header {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .logo-box {
        flex: 0 0 auto;
        width: 46px;
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .logo { max-width: 46px; max-height: 46px; object-fit: contain; }
      .company { min-width: 0; }
      .company-name {
        font-size: 12.5px;
        font-weight: 600;
        color: #1f2430;
        line-height: 1.25;
      }
      .company-address {
        margin-top: 1px;
        font-size: 8.5px;
        color: #6b7280;
        line-height: 1.35;
      }
      .header-rule {
        margin-top: 8px;
        height: 2px;
        background: linear-gradient(90deg, #8ab933 0%, #d7e4bd 55%, #eef2e6 100%);
        border-radius: 2px;
      }

      /* ───── ชื่อรายงาน ───── */
      .tr-titlewrap { margin-top: 9px; }
      .tr-title {
        font-size: 15.5px;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: #1f2430;
      }
      .tr-meta {
        margin-top: 3px;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      /* เงื่อนไขรายงานเป็นป้ายแยกชิ้น อ่านง่ายกว่าประโยคยาวคั่นด้วยจุด */
      .tr-chip {
        /*
          ⚠️ padding บน/ล่าง **ไม่เท่ากันโดยตั้งใจ** (2px / 5px) — อย่า "แก้" ให้เท่ากัน

          PDF ชุดนี้เรนเดอร์ผ่าน html2canvas ซึ่งไม่ได้ใช้ layout ของเบราว์เซอร์วาด
          ข้อความ แต่คำนวณ baseline เองจาก font metrics · กับฟอนต์ไทยมันวางตัวอักษร
          ต่ำกว่าที่เบราว์เซอร์วาง และ align-items:center ของ flex ไม่ช่วยเลย
          เพราะ html2canvas ไม่ได้อ่านค่านั้น

          **ต้องจัดกลางที่ "ตัวอักษรหลัก" ไม่ใช่ขอบหมึกทั้งก้อน** — สระบน/วรรณยุกต์
          โด่งขึ้นไปสูงกว่าตัวหลักมาก ถ้าจัดกลางทั้งก้อนรวมสระ ตัวหลักจะดูต่ำทันที
          ซึ่งเป็นสิ่งที่ตาคนจับได้

          วัดจากภาพที่ html2canvas เรนเดอร์จริง ด้วยข้อความจริงของรายงาน 3 แบบ
          (scale 3 · ค่าเบี่ยง = ช่องว่างบน − ล่าง ของ "ตัวหลัก" เป็นพิกเซล
           แยกตัวหลักจากสระด้วยความหนาแน่นหมึกต่อแถว):
            padding 3/3 (เท่ากัน) → +9.67  ชิดล่างชัด ← ของเดิมที่ถูกร้องเรียน
            padding 2/4           → +3.67  ยังต่ำอยู่  ← รอบที่แล้วหยุดตรงนี้
            padding 1.5/4.5       → +1.67
            padding 2/5           →  0.67  ← ใช้ค่านี้ (≈0.2px จริง)
            padding 1/5           →  -2.33 เลยไปทางสูง
          ถ้าเปลี่ยนขนาดฟอนต์หรือ line-height ของป้ายนี้ ต้องวัดใหม่
        */
        display: inline-block;
        padding: 2px 8px 5px;
        border: 1px solid #e3e8da;
        border-radius: 999px;
        background: #f7faf1;
        color: #55606f;
        font-size: 8.5px;
        line-height: 1.1;
      }

      /* หน้าต่อ ๆ ไป — แถบบางพอให้รู้ว่าเอกสารอะไร ไม่กินที่ตาราง */
      .tr-head-next {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        padding-bottom: 7px;
        border-bottom: 1.5px solid #8ab933;
        font-size: 10px;
        font-weight: 600;
        color: #39414f;
      }
      .tr-head-next .tr-cont { font-weight: 400; color: #8a9199; font-size: 9px; }

      .tr-body { flex: 1 1 auto; min-height: 0; }
      .tr-table {
        width: ${TABLE_WIDTH}px;
        border-collapse: collapse;
        table-layout: fixed;
      }
      /* เส้นแนวนอนอย่างเดียว ไม่ตีกรอบทุกช่อง — ตารางเลขอ่านลื่นกว่าแบบตาราง grid */
      .tr-table th,
      .tr-table td {
        border: 0;
        border-bottom: 1px solid #edf0e8;
        padding: 4px 6px;
        text-align: left;
        vertical-align: top;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .tr-table th {
        background: #f2f6e9;
        color: #44506a;
        font-weight: 600;
        font-size: 8.5px;
        letter-spacing: -0.01em;
        vertical-align: bottom;
        border-bottom: 1.5px solid #8ab933;
        /*
          หัวตารางต้องอยู่บรรทัดเดียวเสมอ — หัวที่ตัดสองบรรทัดดันแถวแรกให้สูงขึ้น
          และทำให้ความสูงหัวตารางไม่เท่ากันระหว่างหน้า
          padding แคบกว่าช่องข้อมูลเพื่อเผื่อที่ให้ตัวอักษร · ellipsis เป็นตาข่ายกันพลาด
          ถ้าวันหลังมีใครตั้งหัวยาวเกินความกว้างคอลัมน์ จะได้ไม่ล้นไปทับช่องข้างๆ
        */
        padding: 3px 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        overflow-wrap: normal;
        word-break: normal;
      }
      .tr-table th:first-child { border-top-left-radius: 5px; }
      .tr-table th:last-child { border-top-right-radius: 5px; }
      .tr-table .c { text-align: center; }
      .tr-table .r { text-align: right; }
      .tr-table td.num {
        text-align: right;
        white-space: nowrap;
        overflow-wrap: normal;
        word-break: normal;
        padding: 4px 6px;
        font-size: 9px;
        font-variant-numeric: tabular-nums;
      }

      /* แถวสลับสีอ่อนมาก — ช่วยกวาดสายตาตามแถวยาว ๆ โดยไม่ทำให้หน้าเลอะ */
      .tr-table tr.detail:nth-child(even) td { background: #fafbf7; }
      .tr-table tr.detail td { color: #55606f; }
      .tr-table tr.detail td.lead { padding-left: 18px; }
      .tr-table.nested tr.detail td.lead { padding-left: 26px; }

      /* หัวกลุ่ม — ใช้แถบสีซ้ายแทนการถมพื้นทั้งแถว ดูเบากว่าและยังแยกกลุ่มชัด */
      .tr-table tr.group td {
        background: #eef4e4;
        color: #1f2430;
        font-weight: 600;
        border-top: 1px solid #c3d49b;
        border-bottom: 1px solid #c3d49b;
      }
      .tr-table tr.group td.first { box-shadow: inset 3px 0 0 #8ab933; }
      .tr-table tr.sub td {
        background: #f6f9f0;
        color: #39414f;
        font-weight: 600;
      }
      .tr-table tr.sub td.first { box-shadow: inset 2px 0 0 #c3d49b; }
      .tr-table tr.sub td.lead { padding-left: 13px; }

      .tr-table td.neg,
      .tr-table tr.detail td.neg { color: #d4380d; }
      .tr-table .code { font-weight: 600; color: #1f2430; }
      .tr-table td.tr-empty {
        text-align: center;
        color: #9ca3af;
        padding: 26px 0;
      }

      .tr-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 7px;
        padding-top: 6px;
        border-top: 1px solid #edf0e8;
        font-size: 8px;
        color: #8a9199;
      }
      .tr-foot .tr-foot-brand { font-weight: 600; color: #6b7280; }
      .tr-foot .tr-foot-page {
        color: #55606f;
        font-variant-numeric: tabular-nums;
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
  const subGroupRows = new Set(report.subGroupRows ?? []);
  const rowClass = (index: number) =>
    groupRows.has(index) ? "group" : subGroupRows.has(index) ? "sub" : "detail";
  const tableClass = subGroupRows.size ? "tr-table nested" : "tr-table";
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
      `<tr class="${rowClass(index)}">${columns
        .map((col, colIndex) =>
          cellHtml(row, col, colIndex === lead, colIndex === 0),
        )
        .join("")}</tr>`,
  );
  /* เงื่อนไขรายงานเป็นป้ายแยกชิ้น — เดิมต่อกันเป็นประโยคยาวคั่นด้วย " · " */
  const metaChips = (report.meta ?? [])
    .map((item) => `<span class="tr-chip">${escapeHtml(item)}</span>`)
    .join("");
  const brand = escapeHtml(companyBrandName() ?? "");

  return {
    firstHead: `<div class="tr-head">${companyHeaderHtml()}<div class="tr-titlewrap"><div class="tr-title">${escapeHtml(
      report.title,
    )}</div>${
      metaChips ? `<div class="tr-meta">${metaChips}</div>` : ""
    }</div></div>`,
    /*
      หน้าต่อไปไม่ซ้ำหัวจดหมายเต็ม ๆ — รายงานยาวหลายสิบหน้าจะเสียพื้นที่ตาราง
      ไปกับโลโก้ทุกหน้า เอาแค่ชื่อบริษัทกับชื่อรายงานพอให้รู้ว่าแผ่นนี้ของเอกสารไหน
    */
    nextHead: `<div class="tr-head tr-head-next"><span>${
      brand ? `${brand} · ` : ""
    }${escapeHtml(report.title)}</span><span class="tr-cont">(ต่อ)</span></div>`,
    table: (bodyRows) =>
      `<div class="tr-body"><table class="${tableClass}">${colgroup}<thead><tr>${head}</tr></thead><tbody>${
        bodyRows ||
        `<tr><td class="tr-empty" colspan="${columns.length}">ไม่มีข้อมูล</td></tr>`
      }</tbody></table></div>`,
    foot: (pageNo, total) =>
      `<div class="tr-foot"><span class="tr-foot-brand">${brand}</span><span>พิมพ์ ${escapeHtml(
        printedAt,
      )}</span><span class="tr-foot-page">หน้า ${pageNo} / ${total}</span></div>`,
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
  /*
    ต้องโหลดก่อนสร้าง HTML — companyHeaderHtml() อ่านจาก snapshot ที่ตัวนี้เติมให้
    ถ้าไม่เรียก หัวจดหมายจะว่างเปล่าแบบไม่มี error (เหมือน PDF ใบอื่นในระบบ)
  */
  await ensureCompanyInfo();

  const parts = buildParts(report);
  const { rowHeights, firstBudget, nextBudget } = await measure(parts);
  const pages = paginateRows(
    rowHeights,
    new Set(report.groupRows ?? []),
    firstBudget,
    nextBudget,
    new Set(report.subGroupRows ?? []),
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
