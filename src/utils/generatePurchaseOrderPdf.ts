import {
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  formatMoney,
  formatQty,
  openMultiPagePdfFromHtml,
} from "./pdf-common";

type PurchaseOrderPdfItem = {
  no: number;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  amount: number;
};

export type PurchaseOrderPdfData = {
  poNo: string;
  poDate: string;
  vendorName: string;
  vendorCode: string;
  vendorTaxId: string;
  vendorAddress: string;
  vendorPhone: string;
  vendorContact: string;
  paymentTerm: string;
  taxRateLabel: string;
  vatRate?: number;
  withholdingTaxLabel: string;
  paymentMethodLabel: string;
  createdBy: string;
  createdByPhone: string;
  expectedDeliveryDate: string;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  afterDiscount?: number;
  vatAmount: number;
  totalAmount: number;
  items: PurchaseOrderPdfItem[];
};

const PAGE_ID = "purchase-order-pdf";

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

function infoRow(label: string, value?: string, valueClass = "") {
  const extra = valueClass ? ` ${valueClass}` : "";
  return `<div class="label">${escapeHtml(label)}</div><div class="value${extra}">${escapeHtml(dash(value))}</div>`;
}

/* ---------- ชิ้นส่วน HTML — แยกเป็นก้อนเพราะตัวจัดหน้าต้องวัดทีละก้อน ---------- */

function headHtml() {
  return `
      <div class="topbar">
        <img src="${companyLogoUrl()}" class="logo" alt="" crossorigin="anonymous" />
        <div class="company">${companyIdentityLinesHtml({
          phoneLabel: "เบอร์ติดต่อ",
          taxIdStyle: "grouped",
        })}
        </div>
      </div>
      <div class="rule"></div>`;
}

function firstBlockHtml(data: PurchaseOrderPdfData) {
  return `
      <div class="headrow">
        <div class="titlebox">
          <div class="title-th">ใบสั่งซื้อ</div>
          <div class="title-en">Purchase Order</div>
        </div>
        <div class="docbox">
          <div>
            <div class="doclabel">เลขที่เอกสาร</div>
            <div class="docval">${escapeHtml(data.poNo)}</div>
          </div>
          <div>
            <div class="doclabel">วันที่ออกเอกสาร</div>
            <div class="docval">${escapeHtml(data.poDate)}</div>
          </div>
        </div>
      </div>

      <div class="section-rule"></div>

      <div class="info-wrap">
        <section class="info-card">
          <div class="card-title">ข้อมูลผู้ขาย</div>
          <div class="info-grid">
            ${infoRow("ลูกค้า :", data.vendorName)}
            ${infoRow("รหัสลูกค้า:", data.vendorCode)}
            ${infoRow("เลขผู้เสียภาษี :", data.vendorTaxId)}
            ${infoRow("ที่อยู่ :", data.vendorAddress)}
            ${infoRow("เบอร์โทร :", data.vendorPhone)}
            ${infoRow("ผู้ติดต่อ :", data.vendorContact)}
          </div>
        </section>

        <section class="info-card">
          <div class="card-title">ข้อมูลการสั่งซื้อ</div>
          <div class="info-grid">
            ${infoRow("เงื่อนไขการชำระเงิน:", data.paymentTerm)}
            ${infoRow("วิธีชำระเงิน / Payment:", data.paymentMethodLabel)}
            ${infoRow("อัตราภาษี:", data.taxRateLabel)}
            ${infoRow("ภาษีหัก ณ ที่จ่าย:", data.withholdingTaxLabel)}
            ${infoRow("ผู้ติดต่อ / Contact:", data.createdBy)}
            ${infoRow("เบอร์โทร / Phone:", data.createdByPhone)}
            ${infoRow("วันที่ส่งมอบ:", data.expectedDeliveryDate)}
            ${infoRow("หมายเหตุ / Remarks:", data.remark, "value-clamp")}
          </div>
        </section>
      </div>`;
}

/** หัวหน้าถัดไป — คนอ่านต้องรู้ว่ากระดาษแผ่นนี้เป็นของใบสั่งซื้อใบไหน */
function contStripHtml(data: PurchaseOrderPdfData) {
  return `
      <div class="cont-strip">
        <span class="cont-title">ใบสั่งซื้อ / Purchase Order</span>
        <span class="cont-no">เลขที่ ${escapeHtml(data.poNo)} · ${escapeHtml(data.poDate)}</span>
      </div>`;
}

function theadHtml() {
  return `
        <div class="tr thead">
          <div class="cell center">ลำดับ</div>
          <div class="cell center">รหัสสินค้า</div>
          <div class="cell cell-name">รายการสินค้า / Description</div>
          <div class="cell center">หน่วย</div>
          <div class="cell center">จำนวน</div>
          <div class="cell right">ราคาต่อหน่วย</div>
          <div class="cell right">ส่วนลด</div>
          <div class="cell right">จำนวนเงิน</div>
        </div>`;
}

function rowHtml(item: PurchaseOrderPdfItem) {
  return `
        <div class="tr tbody">
          <div class="cell center">${item.no}</div>
          <div class="cell center">${escapeHtml(item.itemCode)}</div>
          <div class="cell cell-name">${escapeHtml(item.itemName)}</div>
          <div class="cell center">${escapeHtml(item.unit)}</div>
          <div class="cell center">${formatQty(item.qty)}</div>
          <div class="cell right">${formatMoney(item.unitPrice)}</div>
          <div class="cell right">${formatMoney(item.discountAmount)}</div>
          <div class="cell right">${formatMoney(item.amount)}</div>
        </div>`;
}

function totalsHtml(data: PurchaseOrderPdfData) {
  return `
      <div class="totals">
        <div class="tot-row">
          <div class="k">ยอดรวมก่อนส่วนลด:</div>
          <div class="v">${formatMoney(data.subtotalAmount)}</div>
        </div>
        <div class="tot-row">
          <div class="k">ส่วนลดท้ายบิล:</div>
          <div class="v">${formatMoney(data.discountAmount)}</div>
        </div>
        <div class="tot-row">
          <div class="k">ยอดหลังหักส่วนลด:</div>
          <div class="v">${formatMoney(
            data.afterDiscount ??
              Math.max(0, data.subtotalAmount - data.discountAmount),
          )}</div>
        </div>
        <div class="tot-row">
          <div class="k">${
            data.vatRate && data.vatRate > 0
              ? `ภาษีมูลค่าเพิ่ม ${data.vatRate}%:`
              : "ภาษีมูลค่าเพิ่ม:"
          }</div>
          <div class="v">${formatMoney(data.vatAmount)}</div>
        </div>
        <div class="tot-row grand">
          <div class="k">ยอดสุทธิ:</div>
          <div class="v">${formatMoney(data.totalAmount)}</div>
        </div>
      </div>`;
}

function noteHeadHtml() {
  return `
      <div class="note-rule"></div>
      <div class="note-title">หมายเหตุ :</div>`;
}

function noteChunkHtml(text: string) {
  return `<div class="note-value">${escapeHtml(text)}</div>`;
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
            <div>ผู้อนุมัติ / (Approved By)</div>
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
      <div class="po-foot${pinned ? " pinned" : ""}">
        <span>เอกสารออกจากระบบ ERP - SMT</span>
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
        color: #7A7A7A;
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
        ห้ามล้าง .po-foot ตัวธรรมดา ไม่งั้น margin 18px ของมันจะไม่ถูกนับเป็นงบ
        แล้วหน้าที่เนื้อหาพอดี ๆ จะล้นออกไปสิบกว่าพิกเซล
      */
      .page.probe .page-end,
      .page.probe .po-foot.pinned {
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

      .topbar {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex-shrink: 0;
      }

      .logo {
        width: auto;
        height: 56px;
        max-width: 120px;
        object-fit: contain;
        object-position: left top;
        display: block;
        flex: 0 0 auto;
        margin-top: -10px;
      }

      .company {
        line-height: 1.26;
      }

      .company-name {
        font-size: 15px;
        margin: 0 0 4px;
        font-weight: 700;
        color: #343434;
      }

      .company-address {
        font-size: 7.4px;
        margin: 0;
        color: #7A7A7A;
        font-weight: 400;
        line-height: 1.26;
      }

      .company-address + .company-address {
        margin-top: 3px;
      }

      .rule {
        height: 1px;
        background: #D8DCE0;
        margin: 14px 0;
        flex-shrink: 0;
      }

      .headrow {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .titlebox {
        margin-left: 111px;
        margin-top: -2px;
      }

      .title-th {
        font-size: 24px;
        color: #78b64c;
        font-weight: 700;
        line-height: 1;
      }

      .title-en {
        font-size: 10px;
        color: #AA9F97;
        margin-top: 7px;
        text-align: center;
      }

      .docbox {
        width: 233px;
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        overflow: hidden;
        display: grid;
        grid-template-columns: 1fr 1fr;
      }

      .docbox > div {
        padding: 9px 10px 8px;
      }

      .docbox > div + div {
        border-left: 1px solid #D8DCE0;
      }

      .doclabel {
        font-size: 7px;
        color: #343434;
        margin-bottom: 5px;
      }

      .docval {
        font-size: 10px;
        color: #343434;
        font-weight: 700;
      }

      .cont-strip {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .cont-title {
        font-size: 11px;
        color: #78b64c;
        font-weight: 700;
      }

      .cont-no {
        font-size: 8px;
        color: #343434;
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
        gap: 14px;
        flex-shrink: 0;
      }

      .info-card {
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        padding: 10px 10px 9px;
        min-height: 121px;
      }

      .card-title {
        font-size: 8.5px;
        color: #343434;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 70px 1fr;
        row-gap: 6px;
      }

      .label {
        font-size: 7px;
        color: #7A7A7A;
      }

      .value {
        font-size: 7.2px;
        color: #7A7A7A;
        word-break: break-word;
        min-width: 0;
      }

      /*
        การ์ดข้อมูลการสั่งซื้อเป็นตารางสองคอลัมน์ที่ไหลข้ามหน้าไม่ได้ จึงยังตัดสามบรรทัด
        ข้อความเต็มไปโผล่ที่บล็อก "หมายเหตุ :" ท้ายเอกสาร ไม่มีข้อมูลหาย
      */
      .value-clamp {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        overflow: hidden;
        max-height: 32px;
        line-height: 1.35;
        white-space: pre-wrap;
      }

      .table {
        width: 100%;
        margin-top: 14px;
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .tr {
        display: grid;
        width: 100%;
        grid-template-columns: 34px 60px 1fr 40px 42px 78px 50px 64px;
        align-items: center;
      }

      .cell-name {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .thead {
        background: #ececeb;
        min-height: 33px;
        font-size: 7.6px;
        color: #343434;
        font-weight: 700;
      }

      .tbody {
        min-height: 31px;
        font-size: 7.5px;
        color: #7A7A7A;
        border-top: 1px solid #D8DCE0;
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

      .totals {
        width: 229px;
        margin-left: auto;
        margin-top: 20px;
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        padding: 10px 8px 9px;
        flex-shrink: 0;
      }

      .tot-row {
        display: grid;
        grid-template-columns: 1fr 78px;
        min-height: 18px;
        align-items: center;
        font-size: 7.5px;
        line-height: 1;
      }

      .tot-row .k,
      .tot-row .v {
        display: flex;
        align-items: center;
        line-height: 1;
      }

      .tot-row .k { color: #343434; }
      .tot-row .v {
        justify-content: flex-end;
        text-align: right;
        color: #7A7A7A;
        font-weight: 700;
      }

      .grand {
        margin-top: 4px;
        background: #f2f8ec;
        border-radius: 4px;
        padding: 4px 7px 9px;
        font-size: 8px;
      }

      .grand .k,
      .grand .v {
        transform: translateY(-2px);
      }

      .grand .k {
        color: #343434;
        font-weight: 700;
      }

      .grand .v {
        color: #73b645;
        font-weight: 700;
      }

      .note-rule {
        height: 1px;
        background: #D8DCE0;
        margin: 14px 0;
        flex-shrink: 0;
      }

      .note-title {
        font-size: 7.5px;
        color: #343434;
        margin-bottom: 3px;
        flex-shrink: 0;
      }

      /* ไม่ตัดข้อความทิ้งแล้ว — ยาวเกินหน้าให้ตัวจัดหน้าหั่นไหลไปหน้าถัดไปแทน */
      .note-value {
        font-size: 8px;
        color: #7A7A7A;
        line-height: 1.35;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
        flex-shrink: 0;
      }

      .page-end {
        margin-top: auto;
        flex-shrink: 0;
      }

      .signatures {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 74px;
        margin-top: 24px;
        padding: 0 66px;
      }

      .sig {
        text-align: center;
        color: #7A7A7A;
        font-size: 6.7px;
      }

      .sig .line {
        width: 122px;
        border-bottom: 1px dotted #D8DCE0;
        margin: 24px auto 10px;
      }

      .sig .date {
        margin-top: 0;
        color: #7A7A7A;
      }

      .po-foot {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-top: 10px;
        padding-top: 6px;
        font-size: 6.8px;
        color: #7A7A7A;
        flex-shrink: 0;
      }

      .po-foot.pinned {
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
  totals: number;
  noteHead: number;
  paragraphs: number[];
  pageEnd: number;
  foot: number;
  noteLine: number;
};

type Probe = {
  root: HTMLElement;
  /** ช่องวัดข้อความหมายเหตุระหว่างหาจุดตัด */
  scratch: HTMLElement;
  metrics: Metrics;
};

/** แตกหมายเหตุตามการขึ้นบรรทัดของผู้ใช้ — บรรทัดว่างยังนับเป็นบรรทัดว่างจริง */
function splitParagraphs(remark: string) {
  return remark.replace(/\r\n?/g, "\n").split("\n");
}

/**
 * วัดทุกก้อนในรอบเดียว
 *
 * ใช้หมุดสูงศูนย์คั่นระหว่างก้อนแล้วอ่านส่วนต่างของ `offsetTop` — ได้ความสูงรวม
 * margin มาด้วย ซึ่ง `getBoundingClientRect()` ให้ไม่ได้ และก้อนอย่าง `.totals`
 * กับ `.rule` มี margin ที่กินที่จริงบนหน้ากระดาษ
 */
function buildProbe(data: PurchaseOrderPdfData, paragraphs: string[]): Probe {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = `${PAGE_WIDTH}px`;
  root.style.background = "#fff";

  const mark = (id: number) => `<span class="pm" data-pm="${id}"></span>`;

  root.innerHTML = `
    ${createStyle()}
    <div class="page probe" id="po-probe">
      ${mark(0)}${headHtml()}
      ${mark(1)}${firstBlockHtml(data)}
      ${mark(2)}${contStripHtml(data)}
      ${mark(3)}${totalsHtml(data)}
      ${mark(4)}${noteHeadHtml()}
      ${mark(5)}${pageEndHtml()}
      ${mark(6)}${footBarHtml(0, 1, false)}
      ${mark(7)}
      <div class="table" id="po-probe-table">
        ${theadHtml()}${data.items.map(rowHtml).join("")}
      </div>
      <div id="po-probe-notes">
        ${paragraphs.map((text) => noteChunkHtml(text)).join("")}
      </div>
      <div class="note-value" id="po-probe-scratch"></div>
    </div>
  `;

  document.body.appendChild(root);

  const marks = Array.from(root.querySelectorAll<HTMLElement>(".pm")).sort(
    (a, b) => Number(a.dataset.pm) - Number(b.dataset.pm),
  );
  const span = (from: number, to: number) =>
    marks[to].offsetTop - marks[from].offsetTop;

  const table = root.querySelector<HTMLElement>("#po-probe-table")!;
  const notes = root.querySelector<HTMLElement>("#po-probe-notes")!;
  const scratch = root.querySelector<HTMLElement>("#po-probe-scratch")!;

  const height = (el: Element) => el.getBoundingClientRect().height;

  scratch.textContent = "หมายเหตุ";
  const noteLine = height(scratch);
  scratch.textContent = "";

  return {
    root,
    scratch,
    metrics: {
      head: span(0, 1),
      first: span(1, 2),
      cont: span(2, 3),
      totals: span(3, 4),
      noteHead: span(4, 5),
      pageEnd: span(5, 6),
      foot: span(6, 7),
      thead: height(table.querySelector(".tr.thead")!),
      rows: Array.from(table.querySelectorAll(".tr.tbody")).map(height),
      paragraphs: Array.from(notes.children).map(height),
      noteLine,
    },
  };
}

/**
 * หาส่วนหน้าของข้อความที่ยาวที่สุดที่ยังสูงไม่เกินงบ
 *
 * ตัดตรงช่องว่างถ้ามีอยู่ไม่ไกลจากจุดตัด ไม่งั้นตัดกลางคำ — ภาษาไทยไม่เว้นวรรค
 * ระหว่างคำอยู่แล้ว การตัดตามตัวอักษรจึงเป็นทางปกติ ไม่ใช่ทางสำรอง
 */
function fitTextChunk(
  scratch: HTMLElement,
  text: string,
  budget: number,
): [chunk: string, rest: string] {
  const measure = (value: string) => {
    scratch.textContent = value;
    return scratch.getBoundingClientRect().height;
  };

  if (measure(text) <= budget) {
    return [text, ""];
  }

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(text.slice(0, mid)) <= budget) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  if (lo <= 0) {
    return ["", text];
  }

  let cut = lo;
  const space = text.lastIndexOf(" ", lo);
  if (space > lo * 0.5) {
    cut = space;
  }

  const chunk = text.slice(0, cut);
  if (!chunk.trim()) {
    return ["", text];
  }
  return [chunk, text.slice(cut).replace(/^ +/, "")];
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

function buildPages(
  data: PurchaseOrderPdfData,
  probe: Probe,
  paragraphs: string[],
): string[] {
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
        `ใบสั่งซื้อ ${data.poNo}: จัดหน้าเกิน ${MAX_PAGES} หน้า — เนื้อหายาวผิดปกติ`,
      );
    }
    page = newPage();
  };

  // 1) แถวสินค้า — ตัดได้ระหว่างแถวเท่านั้น ขึ้นหน้าใหม่ต้องมีหัวตารางซ้ำ
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

  // 2) ยอดรวม — ยกทั้งก้อน ห้ามตัดครึ่ง
  if (page.used > 0 && m.totals > free()) {
    nextPage();
  }
  page.tail.push(totalsHtml(data));
  page.used += m.totals;

  // 3) หมายเหตุ — หัวข้อต้องมีอย่างน้อยหนึ่งบรรทัดตามหลัง ไม่งั้นยกไปหน้าใหม่
  if (page.used > 0 && m.noteHead + m.noteLine > free()) {
    nextPage();
  }
  page.tail.push(noteHeadHtml());
  page.used += m.noteHead;

  for (let i = 0; i < paragraphs.length; i += 1) {
    let rest = paragraphs[i];
    let restHeight = m.paragraphs[i] ?? 0;

    // บรรทัดว่างที่ผู้ใช้เคาะไว้ยังต้องกินที่หนึ่งบรรทัด
    if (rest === "") {
      if (page.used > 0 && restHeight > free()) {
        nextPage();
      }
      page.tail.push(noteChunkHtml(""));
      page.used += restHeight;
      continue;
    }

    while (rest !== "") {
      if (restHeight <= free()) {
        page.tail.push(noteChunkHtml(rest));
        page.used += restHeight;
        break;
      }

      const [chunk, remainder] = fitTextChunk(probe.scratch, rest, free());

      if (chunk === "") {
        // หน้านี้ไม่เหลือที่แม้แต่บรรทัดเดียว
        if (page.used === 0) {
          // หน้าเปล่ายังใส่ไม่ลง = คำนวณเพี้ยน ใส่ทั้งก้อนดีกว่าวนไม่รู้จบ
          page.tail.push(noteChunkHtml(rest));
          page.used += restHeight;
          break;
        }
        nextPage();
        continue;
      }

      page.tail.push(noteChunkHtml(chunk));
      page.used = capacity(page);
      rest = remainder;
      if (rest === "") {
        break;
      }

      nextPage();
      probe.scratch.textContent = rest;
      restHeight = probe.scratch.getBoundingClientRect().height;
    }
  }

  // 4) ลายเซ็น — ก้อนเดียวจบ อยู่หน้าสุดท้ายเสมอ
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
export async function buildPurchaseOrderPagesHtml(data: PurchaseOrderPdfData) {
  // ต้องรอฟอนต์ก่อนวัด — Sarabun สูงกว่า fallback ถ้าวัดก่อนโหลดเสร็จหน้าจะล้น
  await waitForSarabun();

  const paragraphs = splitParagraphs(dash(data.remark));
  const probe = buildProbe(data, paragraphs);

  try {
    return buildPages(data, probe, paragraphs);
  } finally {
    document.body.removeChild(probe.root);
  }
}

export async function generatePurchaseOrderPdf(data: PurchaseOrderPdfData) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const pagesHtml = await buildPurchaseOrderPagesHtml(data);

  await openMultiPagePdfFromHtml(PAGE_ID, pagesHtml, {
    wrapperWidth: `${PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}
