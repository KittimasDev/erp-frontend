import {
  companyBrandName,
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  openMultiPagePdfFromHtml,
} from "./pdf-common";

import type { ReceiptDetail } from "@/types/raw-tire-purchase-receipt";
import { formatDeductionDisplayName } from "@/types/raw-tire-purchase-receipt";

type ReceiptPdfItem = {
  no: number;
  classificationCode: string;
  classificationName: string;
  weightKg: string;
  pricePerKg: string;
  amount: string;
  description: string;
};

type ReceiptPdfDeduction = {
  no: number;
  deductionName: string;
  deductionWeightKg: string;
  deductionPricePerKg: string;
  deductionAmount: string;
};

export type RawTirePurchaseReceiptPdfData = {
  receiptNo: string;
  receiptDate: string;
  sellerCode: string;
  sellerName: string;
  contactName: string;
  phone: string;
  truckLicensePlate: string;
  driverName: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  items: ReceiptPdfItem[];
  deductions: ReceiptPdfDeduction[];
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
};

const PAGE_ID = "raw-tire-receipt-pdf";

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

function formatWeight(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPrice(value: string | number) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    return String(value);
  }
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("th-TH");
}

export function mapReceiptDetailToPdfData(
  receipt: ReceiptDetail,
): RawTirePurchaseReceiptPdfData {
  return {
    receiptNo: receipt.receiptNo,
    receiptDate: formatDate(receipt.receiptDate),
    sellerCode: receipt.seller.sellerCode,
    sellerName: receipt.seller.sellerName,
    contactName: receipt.seller.contactName || "-",
    phone: receipt.seller.phone || "-",
    truckLicensePlate:
      receipt.truck?.licensePlate || receipt.ticket?.truckLicensePlate || "-",
    driverName: receipt.truck?.driverName || receipt.ticket?.driverName || "-",
    grossWeightKg: formatWeight(receipt.grossWeightKg),
    tareWeightKg: formatWeight(receipt.tareWeightKg),
    netWeightKg: formatWeight(receipt.netWeightKg),
    items: receipt.items.map((item, index) => ({
      no: index + 1,
      classificationCode: item.classificationCode || "-",
      classificationName: item.classificationName || "-",
      weightKg: formatWeight(item.weightKg),
      pricePerKg: formatPrice(item.pricePerKg),
      amount: formatMoney(item.amount),
      description: item.description || "",
    })),
    deductions: receipt.deductions.map((row, index) => ({
      no: index + 1,
      deductionName: formatDeductionDisplayName(row),
      deductionWeightKg: formatWeight(row.deductionWeightKg),
      deductionPricePerKg: row.deductionPricePerKg
        ? formatPrice(row.deductionPricePerKg)
        : "-",
      deductionAmount: formatMoney(row.deductionAmount),
    })),
    subtotalAmount: formatMoney(receipt.subtotalAmount),
    deductionAmount: formatMoney(receipt.deductionAmount),
    totalAmount: formatMoney(receipt.totalAmount),
  };
}

function infoRow(label: string, value?: string) {
  return `<div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(dash(value))}</div>`;
}

/* ---------- ชิ้นส่วน HTML — แยกเป็นก้อนเพราะตัวจัดหน้าต้องวัดทีละก้อน ---------- */

function headHtml() {
  return `
      <div class="topbar">
        <img src="${companyLogoUrl()}" class="logo" alt="" crossorigin="anonymous" />
        <div class="company">${companyIdentityLinesHtml({
          taxIdStyle: "grouped",
        })}
        </div>
      </div>
      <div class="rule"></div>`;
}

function firstBlockHtml(data: RawTirePurchaseReceiptPdfData) {
  return `
      <div class="headrow">
        <div class="titlebox">
          <div class="title-th">ใบรับซื้อยาง</div>
          <div class="title-en">Raw Tire Purchase Receipt</div>
        </div>
        <div class="docbox">
          <div>
            <div class="doclabel">เลขที่เอกสาร</div>
            <div class="docval">${escapeHtml(data.receiptNo)}</div>
          </div>
          <div>
            <div class="doclabel">วันที่เอกสาร</div>
            <div class="docval">${escapeHtml(dash(data.receiptDate))}</div>
          </div>
        </div>
      </div>

      <div class="section-rule"></div>

      <div class="info-wrap">
        <section class="info-card">
          <div class="card-title">ข้อมูลผู้ขาย</div>
          <div class="info-grid">
            ${infoRow("ชื่อผู้ขาย :", data.sellerName)}
            ${infoRow("รหัสผู้ขาย :", data.sellerCode)}
            ${infoRow("ผู้ติดต่อ :", data.contactName)}
            ${infoRow("เบอร์โทร :", data.phone)}
          </div>
        </section>

        <section class="info-card">
          <div class="card-title">รถ / น้ำหนัก</div>
          <div class="info-grid">
            ${infoRow("ทะเบียนรถ :", data.truckLicensePlate)}
            ${infoRow("คนขับ :", data.driverName)}
            ${infoRow("น้ำหนักเข้า :", `${data.grossWeightKg} กก.`)}
            ${infoRow("น้ำหนักออก :", `${data.tareWeightKg} กก.`)}
          </div>
          <div class="callout">
            <span>น้ำหนักสุทธิ</span>
            <strong>${escapeHtml(data.netWeightKg)} กก.</strong>
          </div>
        </section>
      </div>`;
}

/** หัวหน้าถัดไป — คนอ่านต้องรู้ว่ากระดาษแผ่นนี้เป็นของใบรับซื้อใบไหน */
function contStripHtml(data: RawTirePurchaseReceiptPdfData) {
  return `
      <div class="cont-strip">
        <span class="cont-title">ใบรับซื้อยาง / Raw Tire Purchase Receipt</span>
        <span class="cont-no">เลขที่ ${escapeHtml(data.receiptNo)} · ${escapeHtml(dash(data.receiptDate))}</span>
      </div>`;
}

function theadHtml() {
  return `
        <div class="tr thead">
          <div class="cell center">ลำดับ</div>
          <div class="cell center">รหัส</div>
          <div class="cell cell-name">รายการ</div>
          <div class="cell right">น้ำหนัก (กก.)</div>
          <div class="cell right">ราคา/กก.</div>
          <div class="cell right">จำนวนเงิน</div>
        </div>`;
}

function itemRowHtml(item: ReceiptPdfItem) {
  return `
        <div class="tr tbody">
          <div class="cell center">${item.no}</div>
          <div class="cell center">${escapeHtml(item.classificationCode)}</div>
          <div class="cell cell-name">
            <div>${escapeHtml(item.classificationName)}</div>
            ${
              item.description
                ? `<div class="sub-line">${escapeHtml(item.description)}</div>`
                : ""
            }
          </div>
          <div class="cell right">${escapeHtml(item.weightKg)}</div>
          <div class="cell right">${escapeHtml(item.pricePerKg)}</div>
          <div class="cell right">${escapeHtml(item.amount)}</div>
        </div>`;
}

/** แถวรายการหัก — เลขลำดับต่อจากรายการรับซื้อ และยอดเป็นค่าติดลบ */
function deductionRowHtml(row: ReceiptPdfDeduction, no: number) {
  return `
        <div class="tr tbody">
          <div class="cell center">${no}</div>
          <div class="cell center"><span class="badge-warn">หัก</span></div>
          <div class="cell cell-name">
            <div>${escapeHtml(row.deductionName)}</div>
          </div>
          <div class="cell right">${escapeHtml(row.deductionWeightKg)}</div>
          <div class="cell right">${escapeHtml(row.deductionPricePerKg)}</div>
          <div class="cell right warn-text">-${escapeHtml(row.deductionAmount)}</div>
        </div>`;
}

function totalsHtml(data: RawTirePurchaseReceiptPdfData) {
  return `
      <div class="totals">
        <div class="tot-row">
          <div class="k">ยอดก่อนหัก:</div>
          <div class="v">${escapeHtml(data.subtotalAmount)}</div>
        </div>
        <div class="tot-row">
          <div class="k">ยอดหัก:</div>
          <div class="v warn-text">${escapeHtml(data.deductionAmount)}</div>
        </div>
        <div class="tot-row grand">
          <div class="k">ยอดสุทธิที่ต้องจ่าย:</div>
          <div class="v">${escapeHtml(data.totalAmount)}</div>
        </div>
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
            <div>ผู้รับเงิน (Received By)</div>
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
        min-height: 105px;
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

      /* แถบน้ำหนักสุทธิในการ์ด — ใช้ภาษาเดียวกับแถวยอดสุทธิของตารางยอดรวม */
      .callout {
        margin-top: 8px;
        background: #f2f8ec;
        border-radius: 4px;
        padding: 6px 7px;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        font-size: 7.5px;
        color: #343434;
      }

      .callout strong {
        font-size: 9px;
        color: #73b645;
        font-weight: 700;
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
        grid-template-columns: 34px 74px 1fr 74px 74px 80px;
        align-items: center;
      }

      .cell-name {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .sub-line {
        margin-top: 2px;
        font-size: 6.5px;
        color: #78b64c;
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

      /* โทนเตือนสำหรับรายการหัก — คุมโทนเดียวกับ PO ไม่ใช้ส้มสดของเดิม */
      .badge-warn {
        display: inline-block;
        border-radius: 3px;
        padding: 1px 5px;
        background: #fdf6e8;
        color: #b0821f;
        font-size: 6.5px;
        font-weight: 700;
      }

      .warn-text { color: #b0821f; }

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
      }

      .tot-row .k { color: #343434; }
      .tot-row .v {
        text-align: right;
        color: #7A7A7A;
        font-weight: 700;
      }

      .grand {
        margin-top: 4px;
        background: #f2f8ec;
        border-radius: 4px;
        padding: 6px 7px;
        font-size: 8px;
      }

      .grand .k {
        color: #343434;
        font-weight: 700;
      }

      .grand .v {
        color: #73b645;
        font-weight: 700;
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

      .doc-foot {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-top: 10px;
        padding-top: 6px;
        font-size: 6.8px;
        color: #7A7A7A;
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
  totals: number;
  pageEnd: number;
  foot: number;
};

type Probe = {
  root: HTMLElement;
  metrics: Metrics;
};

/** รายการรับซื้อกับรายการหักอยู่ตารางเดียวกัน เลขลำดับไหลต่อเนื่อง */
function allRowsHtml(data: RawTirePurchaseReceiptPdfData) {
  return [
    ...data.items.map(itemRowHtml),
    ...data.deductions.map((row, index) =>
      deductionRowHtml(row, data.items.length + index + 1),
    ),
  ];
}

/**
 * วัดทุกก้อนในรอบเดียว
 *
 * ใช้หมุดสูงศูนย์คั่นระหว่างก้อนแล้วอ่านส่วนต่างของ `offsetTop` — ได้ความสูงรวม
 * margin มาด้วย ซึ่ง `getBoundingClientRect()` ให้ไม่ได้
 */
function buildProbe(data: RawTirePurchaseReceiptPdfData): Probe {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = `${PAGE_WIDTH}px`;
  root.style.background = "#fff";

  const mark = (id: number) => `<span class="pm" data-pm="${id}"></span>`;

  root.innerHTML = `
    ${createStyle()}
    <div class="page probe" id="rt-probe">
      ${mark(0)}${headHtml()}
      ${mark(1)}${firstBlockHtml(data)}
      ${mark(2)}${contStripHtml(data)}
      ${mark(3)}${totalsHtml(data)}
      ${mark(4)}${pageEndHtml()}
      ${mark(5)}${footBarHtml(0, 1, false)}
      ${mark(6)}
      <div class="table" id="rt-probe-table">
        ${theadHtml()}${allRowsHtml(data).join("")}
      </div>
    </div>
  `;

  document.body.appendChild(root);

  const marks = Array.from(root.querySelectorAll<HTMLElement>(".pm")).sort(
    (a, b) => Number(a.dataset.pm) - Number(b.dataset.pm),
  );
  const span = (from: number, to: number) =>
    marks[to].offsetTop - marks[from].offsetTop;

  const table = root.querySelector<HTMLElement>("#rt-probe-table")!;
  const height = (el: Element) => el.getBoundingClientRect().height;

  return {
    root,
    metrics: {
      head: span(0, 1),
      first: span(1, 2),
      cont: span(2, 3),
      totals: span(3, 4),
      pageEnd: span(4, 5),
      foot: span(5, 6),
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

function buildPages(
  data: RawTirePurchaseReceiptPdfData,
  probe: Probe,
): string[] {
  const m = probe.metrics;
  const rows = allRowsHtml(data);
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
        `ใบรับซื้อยาง ${data.receiptNo}: จัดหน้าเกิน ${MAX_PAGES} หน้า — เนื้อหายาวผิดปกติ`,
      );
    }
    page = newPage();
  };

  // 1) รายการรับซื้อ + รายการหัก — ตัดได้ระหว่างแถวเท่านั้น หัวตารางซ้ำทุกหน้า
  for (let i = 0; i < rows.length; i += 1) {
    const rowHeight = m.rows[i] ?? 0;
    const tableCost = page.hasTable ? 0 : m.thead + TABLE_CHROME;

    if (page.used > 0 && tableCost + rowHeight > free()) {
      nextPage();
    }
    if (!page.hasTable) {
      page.used += m.thead + TABLE_CHROME;
      page.hasTable = true;
    }
    page.rows.push(rows[i]);
    page.used += rowHeight;
  }

  // 2) ยอดรวม — ยกทั้งก้อน ห้ามตัดครึ่ง
  if (page.used > 0 && m.totals > free()) {
    nextPage();
  }
  page.tail.push(totalsHtml(data));
  page.used += m.totals;

  // 3) ลายเซ็น — ก้อนเดียวจบ อยู่หน้าสุดท้ายเสมอ
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
export async function buildRawTirePurchaseReceiptPagesHtml(
  data: RawTirePurchaseReceiptPdfData,
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

export async function generateRawTirePurchaseReceiptPdf(
  data: RawTirePurchaseReceiptPdfData,
) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const pagesHtml = await buildRawTirePurchaseReceiptPagesHtml(data);

  await openMultiPagePdfFromHtml(PAGE_ID, pagesHtml, {
    wrapperWidth: `${PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}
