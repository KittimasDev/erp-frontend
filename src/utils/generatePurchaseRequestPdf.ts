import {
  companyBrandName,
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  openMultiPagePdfFromHtml,
} from "./pdf-common";

type PurchaseRequestItem = {
  no: number;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
};

export type PurchaseRequestPdfData = {
  prNo: string;
  requestBy: string;
  department: string;
  requestDate: string;
  requiredDate: string;
  purchaseType: string;
  items: PurchaseRequestItem[];
};

const PAGE_ID = "purchase-request-pdf";

/** A4 ที่ความกว้าง 594px — ต้องตรึงทั้งคู่ ไม่งั้นแคปทีละหน้าแล้วสัดส่วนเพี้ยน */
const PAGE_WIDTH = 594;
const PAGE_HEIGHT = 842;
const PAGE_PAD_TOP = 34;
const PAGE_PAD_BOTTOM = 36;
const CONTENT_HEIGHT = PAGE_HEIGHT - PAGE_PAD_TOP - PAGE_PAD_BOTTOM;

/** `.table` กิน margin-top 14px + เส้นขอบบนล่างอีกด้านละ 1px */
const TABLE_CHROME = 16;

/** เผื่อกันฟอนต์ไทยดันความสูงเกินค่าที่วัดได้เศษหนึ่ง */
const SAFETY = 8;

/** กันวนไม่รู้จบถ้าคำนวณพลาดจนบล็อกไม่มีวันลงหน้าได้ */
const MAX_PAGES = 200;

function dash(value?: string) {
  const text = value?.trim();
  return text ? text : "—";
}

/** ใบขอซื้อแสดงจำนวนสองตำแหน่งเสมอ — ต่างจาก formatQty กลางที่ยืดหยุ่น 0-3 */
function formatQty(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function infoRow(label: string, value?: string) {
  return `<div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(dash(value))}</div>`;
}

/* ---------- ชิ้นส่วน HTML — แยกเป็นก้อนเพราะตัวจัดหน้าต้องวัดทีละก้อน ---------- */

function headHtml() {
  const logo = companyLogoUrl();
  return `
      <header class="header">
        <div class="brand">
          ${
            logo
              ? `<img src="${logo}" class="logo" alt="" crossorigin="anonymous" />`
              : `<div class="symbol" aria-hidden="true">◈</div>`
          }
          <div>
            <div class="company">${companyIdentityLinesHtml({
              phoneLabel: "โทร.",
              taxIdStyle: "grouped",
              separator: " • ",
            })}
            </div>
          </div>
        </div>
        <div class="doc-title">
          <strong>ใบขอซื้อ</strong>
          <small>PURCHASE REQUEST</small>
        </div>
      </header>`;
}

function firstBlockHtml(data: PurchaseRequestPdfData) {
  return `
      <div class="doc-meta">
        <div class="meta-cell">
          <span class="meta-label">เลขที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(data.prNo)}</span>
        </div>
        <div class="meta-cell">
          <span class="meta-label">วันที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(data.requestDate)}</span>
        </div>
      </div>

      <div class="info-wrap">
        <section class="info-card">
          <div class="card-title">ข้อมูลผู้ขอซื้อ</div>
          <div class="info-grid">
            ${infoRow("ชื่อผู้ขอซื้อ :", data.requestBy)}
            ${infoRow("ส่วนงานที่ขอ :", data.department)}
          </div>
        </section>

        <section class="info-card">
          <div class="card-title">ข้อมูลการขอซื้อ</div>
          <div class="info-grid">
            ${infoRow("ต้องการภายใน :", data.requiredDate)}
            ${infoRow("ประเภทใบขอซื้อ :", data.purchaseType)}
          </div>
        </section>
      </div>`;
}

/** หัวหน้าถัดไป — คนอ่านต้องรู้ว่ากระดาษแผ่นนี้เป็นของใบขอซื้อใบไหน */
function contStripHtml(data: PurchaseRequestPdfData) {
  return `
      <div class="cont-strip">
        <span class="cont-title">ใบขอซื้อ / Purchase Request</span>
        <span class="cont-no">เลขที่ ${escapeHtml(data.prNo)} · ${escapeHtml(data.requestDate)}</span>
      </div>`;
}

function theadHtml() {
  return `
        <div class="tr thead">
          <div class="cell center">ลำดับ</div>
          <div class="cell center">รหัสสินค้า</div>
          <div class="cell cell-name">รายการ / Description</div>
          <div class="cell center">หน่วย</div>
          <div class="cell right">จำนวน</div>
        </div>`;
}

function rowHtml(item: PurchaseRequestItem) {
  return `
        <div class="tr tbody">
          <div class="cell center">${item.no}</div>
          <div class="cell center">${escapeHtml(item.itemCode)}</div>
          <div class="cell cell-name">${escapeHtml(item.itemName)}</div>
          <div class="cell center">${escapeHtml(item.unit)}</div>
          <div class="cell right">${formatQty(item.qty)}</div>
        </div>`;
}

function pageEndHtml() {
  return `
      <div class="page-end">
        <div class="signatures">
          <div class="sig">
            <div>ผู้จัดทำ (Prepared By)</div>
            <div class="line"></div>
            <div class="date">วันที่ ___/___/___</div>
          </div>
          <div class="sig">
            <div>ผู้ตรวจสอบ (Checked By)</div>
            <div class="line"></div>
            <div class="date">วันที่ ___/___/___</div>
          </div>
          <div class="sig">
            <div>ผู้อนุมัติ (Approved By)</div>
            <div class="line"></div>
            <div class="date">วันที่ ___/___/___</div>
          </div>
        </div>
      </div>`;
}

/**
 * แถบล่างสุดของทุกหน้า
 *
 * `pinned` = หน้านี้ไม่มีบล็อกลายเซ็น จึงต้องดันตัวเองลงล่างด้วย `margin-top: auto`
 * หน้าที่มีลายเซ็นห้าม pinned เพราะ auto สองตัวจะแบ่งที่ว่างกันจนเกิดช่องโหว่กลางหน้า
 */
function footBarHtml(pageIndex: number, pageCount: number, pinned: boolean) {
  return `
      <div class="doc-foot${pinned ? " pinned" : ""}">
        <span>เอกสารออกจากระบบ ERP - ${escapeHtml(companyBrandName())}</span>
        <span>หน้า ${pageIndex + 1} / ${pageCount}</span>
      </div>`;
}

function createStyle() {
  return `
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap");

      * { box-sizing: border-box; }

      /*
        ตรึงความสูงตายตัว ไม่ใช่ min-height — ตัวจัดหน้าคำนวณมาแล้วว่าอะไรลงหน้าไหน
        overflow: hidden กันเนื้อหาที่เกินคาดล้นไปปนกับหน้าถัดไปตอนแคปภาพ
      */
      .page {
        width: ${PAGE_WIDTH}px;
        height: ${PAGE_HEIGHT}px;
        overflow: hidden;
        background: #fff;
        padding: ${PAGE_PAD_TOP}px 23px ${PAGE_PAD_BOTTOM}px;
        position: relative;
        color: #263039;
        font-family: "Sarabun", Tahoma, sans-serif;
        display: flex;
        flex-direction: column;
      }

      /* หน้าจำลองสำหรับวัดความสูง — ต้องยืดได้ และห้ามมี margin auto มาดันตำแหน่ง */
      .page.probe {
        height: auto;
        overflow: visible;
      }

      /*
        เอา margin-top: auto ออกเฉพาะตัวที่ใช้มันดันตัวเองลงล่าง
        ห้ามล้าง .doc-foot ตัวธรรมดา ไม่งั้น margin ของมันจะไม่ถูกนับเป็นงบ
        แล้วหน้าที่เนื้อหาพอดี ๆ จะล้นออกไปสิบกว่าพิกเซล
      */
      .page.probe .page-end,
      .page.probe .doc-foot.pinned {
        margin-top: 0;
      }

      /* หมุดวัดตำแหน่ง สูงศูนย์ ไม่รบกวนเลย์เอาต์ */
      .pm {
        display: block;
        height: 0;
        margin: 0;
        padding: 0;
        flex-shrink: 0;
      }


      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        border-bottom: 1.5px solid #6ba83f;
        padding-bottom: 8px;
        flex-shrink: 0;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .logo {
        height: 46px;
        width: auto;
        max-width: 84px;
        object-fit: contain;
        display: block;
        flex: 0 0 auto;
      }

      .symbol {
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
      }

      .symbol {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6ba83f;
        font-size: 28px;
        font-weight: 800;
      }

      .company-name {
        font-size: 12px;
        margin: 0 0 2px;
        font-weight: 800;
        color: #333;
        line-height: 1.15;
      }

      .company-address {
        font-size: 8px;
        margin: 0;
        color: #555;
        line-height: 1.4;
      }

      .doc-title {
        text-align: right;
        flex-shrink: 0;
      }

      .doc-title strong {
        display: block;
        font-size: 18px;
        color: #315e24;
        line-height: 1.15;
      }

      .doc-title small {
        display: block;
        color: #7c848b;
        letter-spacing: 0.4px;
        font-size: 8px;
      }

      .doc-meta {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        border: 1px solid #d5dce1;
        border-radius: 5px;
        overflow: hidden;
        margin-top: 10px;
        flex-shrink: 0;
      }

      .meta-cell {
        padding: 6px 8px;
        border-right: 1px solid #d5dce1;
      }

      .meta-cell:last-child { border-right: 0; }

      .meta-cell .meta-label {
        color: #66727d;
        font-size: 8px;
        display: block;
        margin-bottom: 2px;
      }

      .meta-cell .meta-value {
        font-weight: 700;
        font-size: 10px;
        color: #263039;
      }

      .cont-strip {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .cont-title {
        font-size: 11px;
        color: #315e24;
        font-weight: 700;
      }

      .cont-no {
        font-size: 8px;
        color: #263039;
        font-weight: 700;
      }

      .section-rule {
        height: 1px;
        background: #D8DCE0;
        margin: 14px 0;
        flex-shrink: 0;
      }

      .info-wrap {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 12px;
        flex-shrink: 0;
      }

      .info-card {
        border: 1px solid #d5dce1;
        border-radius: 6px;
        padding: 8px 10px;
        min-height: 60px;
      }

      .card-title {
        font-size: 10px;
        color: #253626;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 118px 1fr;
        column-gap: 8px;
        row-gap: 5px;
        align-items: baseline;
      }

      .label {
        font-size: 8px;
        color: #66727d;
        line-height: 1.35;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .value {
        font-size: 8.5px;
        color: #263039;
        line-height: 1.35;
        word-break: break-word;
        min-width: 0;
      }

      .table {
        width: 100%;
        margin-top: 14px;
        border: 1px solid #d5dce1;
        border-radius: 5px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .tr {
        display: grid;
        width: 100%;
        grid-template-columns: 34px 90px 1fr 60px 80px;
        align-items: center;
      }

      .cell-name {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .thead {
        background: #edf0ee;
        min-height: 28px;
        font-size: 8px;
        color: #35413b;
        font-weight: 700;
      }

      .tbody {
        min-height: 28px;
        font-size: 8.5px;
        color: #263039;
        border-top: 1px solid #d5dce1;
      }

      .cell {
        padding: 8px 7px;
      }

      .thead .cell {
        padding: 10px 4px 9px;
        white-space: nowrap;
      }

      .center { text-align: center; }
      .right {
        text-align: right;
        white-space: nowrap;
      }

      .page-end {
        margin-top: auto;
        flex-shrink: 0;
      }

      .signatures {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        margin-top: 24px;
        padding: 0 20px;
      }

      .sig {
        text-align: center;
        color: #263039;
        font-size: 8px;
      }

      .sig .line {
        height: 28px;
        border-bottom: 1px solid #93999e;
        margin: 4px 14px 8px;
      }

      .sig .date {
        margin-top: 0;
        color: #66727d;
      }

      .doc-foot {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-top: 16px;
        padding-top: 6px;
        border-top: 1px solid #d5dce1;
        font-size: 7.5px;
        color: #66727d;
        flex-shrink: 0;
      }

      .doc-foot.pinned {
        margin-top: auto;
      }
    </style>
  `;
}

/* ---------- วัดความสูงจริง ---------- */

type Metrics = {
  head: number;
  first: number;
  cont: number;
  thead: number;
  rows: number[];
  pageEnd: number;
  foot: number;
};

type Probe = {
  root: HTMLElement;
  metrics: Metrics;
};

/**
 * วัดทุกก้อนในรอบเดียว
 *
 * ใช้หมุดสูงศูนย์คั่นระหว่างก้อนแล้วอ่านส่วนต่างของ `offsetTop` — ได้ความสูงรวม
 * margin มาด้วย ซึ่ง `getBoundingClientRect()` ให้ไม่ได้ และก้อนอย่าง `.rule`
 * มี margin ที่กินที่จริงบนหน้ากระดาษ
 */
function buildProbe(data: PurchaseRequestPdfData): Probe {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = `${PAGE_WIDTH}px`;
  root.style.background = "#fff";

  const mark = (id: number) => `<span class="pm" data-pm="${id}"></span>`;

  root.innerHTML = `
    ${createStyle()}
    <div class="page probe" id="pr-probe">
      ${mark(0)}${headHtml()}
      ${mark(1)}${firstBlockHtml(data)}
      ${mark(2)}${contStripHtml(data)}
      ${mark(3)}${pageEndHtml()}
      ${mark(4)}${footBarHtml(0, 1, false)}
      ${mark(5)}
      <div class="table" id="pr-probe-table">
        ${theadHtml()}${data.items.map(rowHtml).join("")}
      </div>
    </div>
  `;

  document.body.appendChild(root);

  const marks = Array.from(root.querySelectorAll<HTMLElement>(".pm")).sort(
    (a, b) => Number(a.dataset.pm) - Number(b.dataset.pm),
  );
  const span = (from: number, to: number) =>
    marks[to].offsetTop - marks[from].offsetTop;

  const table = root.querySelector<HTMLElement>("#pr-probe-table")!;
  const height = (el: Element) => el.getBoundingClientRect().height;

  return {
    root,
    metrics: {
      head: span(0, 1),
      first: span(1, 2),
      cont: span(2, 3),
      pageEnd: span(3, 4),
      foot: span(4, 5),
      thead: height(table.querySelector(".tr.thead")!),
      rows: Array.from(table.querySelectorAll(".tr.tbody")).map(height),
    },
  };
}

/* ---------- จัดหน้า ---------- */

type PageDraft = {
  index: number;
  used: number;
  rows: string[];
  tail: string[];
  hasTable: boolean;
  hasPageEnd: boolean;
};

function buildPages(data: PurchaseRequestPdfData, probe: Probe): string[] {
  const m = probe.metrics;
  const pages: PageDraft[] = [];

  const newPage = () => {
    const page: PageDraft = {
      index: pages.length,
      used: 0,
      rows: [],
      tail: [],
      hasTable: false,
      hasPageEnd: false,
    };
    pages.push(page);
    return page;
  };

  let page = newPage();

  /** ที่ว่างของหน้า หลังหักหัวและแถบล่างที่ต้องมีทุกหน้า */
  const capacity = (p: PageDraft) =>
    CONTENT_HEIGHT -
    m.head -
    m.foot -
    (p.index === 0 ? m.first : m.cont) -
    SAFETY;

  const free = () => capacity(page) - page.used;

  const nextPage = () => {
    if (pages.length >= MAX_PAGES) {
      throw new Error(
        `ใบขอซื้อ ${data.prNo}: จัดหน้าเกิน ${MAX_PAGES} หน้า — เนื้อหายาวผิดปกติ`,
      );
    }
    page = newPage();
  };

  // 1) แถวรายการ — ตัดได้ระหว่างแถวเท่านั้น ขึ้นหน้าใหม่ต้องมีหัวตารางซ้ำ
  for (let i = 0; i < data.items.length; i += 1) {
    const rowHeight = m.rows[i] ?? 0;
    const tableCost = page.hasTable ? 0 : m.thead + TABLE_CHROME;

    if (page.used > 0 && tableCost + rowHeight > free()) {
      nextPage();
    }
    if (!page.hasTable) {
      page.used += m.thead + TABLE_CHROME;
      page.hasTable = true;
    }
    page.rows.push(rowHtml(data.items[i]));
    page.used += rowHeight;
  }

  // 2) ลายเซ็น — ก้อนเดียวจบ อยู่หน้าสุดท้ายเสมอ
  if (page.used > 0 && m.pageEnd > free()) {
    nextPage();
  }
  page.tail.push(pageEndHtml());
  page.hasPageEnd = true;

  const pageCount = pages.length;

  return pages.map((draft) => {
    const tableBlock = draft.hasTable
      ? `<div class="table">${theadHtml()}${draft.rows.join("")}</div>`
      : "";

    const body = `
    <div id="${PAGE_ID}-${draft.index}" class="page">
      ${headHtml()}
      ${draft.index === 0 ? firstBlockHtml(data) : contStripHtml(data)}
      ${tableBlock}
      ${draft.tail.join("")}
      ${footBarHtml(draft.index, pageCount, !draft.hasPageEnd)}
    </div>`;

    // สไตล์แนบไปกับหน้าแรก ทุกหน้าอยู่ wrapper เดียวกันจึงใช้ร่วมกันได้
    return draft.index === 0 ? `${createStyle()}${body}` : body;
  });
}

async function waitForSarabun() {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, 2500);
  });
  const loaded = Promise.all([
    document.fonts.load('400 12px "Sarabun"'),
    document.fonts.load('700 12px "Sarabun"'),
  ]).then(() => undefined);
  await Promise.race([loaded, timeout]);
}

/** ประกอบหน้าทั้งหมด — แยกออกมาเพื่อเปิดดูใน harness ได้โดยไม่ต้องสร้าง PDF */
export async function buildPurchaseRequestPagesHtml(
  data: PurchaseRequestPdfData,
) {
  // ต้องรอฟอนต์ก่อนวัด — Sarabun สูงกว่า fallback ถ้าวัดก่อนโหลดเสร็จหน้าจะล้น
  await waitForSarabun();

  const probe = buildProbe(data);

  try {
    return buildPages(data, probe);
  } finally {
    document.body.removeChild(probe.root);
  }
}

export async function generatePurchaseRequestPdf(data: PurchaseRequestPdfData) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const pagesHtml = await buildPurchaseRequestPagesHtml(data);

  await openMultiPagePdfFromHtml(PAGE_ID, pagesHtml, {
    wrapperWidth: `${PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}
