import {
  companyBrandName,
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  openMultiPagePdfFromHtml,
} from "./pdf-common";

import type { PaymentContext } from "@/types/raw-tire-payment";
import { PAYMENT_METHOD_LABELS } from "@/types/raw-tire-purchase-receipt";

export type RawTirePaymentVoucherPdfData = {
  voucherNo: string;
  voucherDate: string;
  receiptNo: string;
  sellerCode: string;
  sellerName: string;
  paymentMethod: string;
  bankInfo: string;
  transactionRef: string;
  amount: string;
  remark: string;
};

const PAGE_ID = "raw-tire-payment-voucher-pdf";

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

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("th-TH");
}

export function mapPaymentContextToPdfData(
  context: PaymentContext,
): RawTirePaymentVoucherPdfData {
  const payment = context.payment;
  const voucher = context.voucher;

  const bankInfo =
    payment?.bankName && payment.accountNo
      ? `${payment.bankName} · ${payment.accountNo}${payment.accountName ? ` · ${payment.accountName}` : ""}`
      : "-";

  return {
    voucherNo: voucher?.voucherNo || "-",
    voucherDate: formatDate(payment?.paymentDate ?? voucher?.voucherDate),
    receiptNo: context.receipt.receiptNo,
    sellerCode: context.seller.sellerCode,
    sellerName: context.seller.sellerName,
    paymentMethod: payment?.paymentMethod
      ? (PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod)
      : voucher?.paymentMethod
        ? (PAYMENT_METHOD_LABELS[voucher.paymentMethod] ??
          voucher.paymentMethod)
        : "-",
    bankInfo,
    transactionRef: payment?.transactionRef || "-",
    amount: formatMoney(
      payment?.amount ?? voucher?.totalAmount ?? context.receipt.totalAmount,
    ),
    remark: payment?.remark || voucher?.remark || "",
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

function firstBlockHtml(data: RawTirePaymentVoucherPdfData) {
  return `
      <div class="headrow">
        <div class="titlebox">
          <div class="title-th">ใบสำคัญจ่าย</div>
          <div class="title-en">Payment Voucher</div>
        </div>
        <div class="docbox">
          <div>
            <div class="doclabel">เลขที่เอกสาร</div>
            <div class="docval">${escapeHtml(data.voucherNo)}</div>
          </div>
          <div>
            <div class="doclabel">วันที่จ่าย</div>
            <div class="docval">${escapeHtml(dash(data.voucherDate))}</div>
          </div>
        </div>
      </div>

      <div class="section-rule"></div>

      <div class="info-wrap">
        <section class="info-card">
          <div class="card-title">ผู้รับเงิน</div>
          <div class="info-grid">
            ${infoRow("ชื่อผู้ขาย :", data.sellerName)}
            ${infoRow("รหัสผู้ขาย :", data.sellerCode)}
            ${infoRow("ใบรับซื้อ :", data.receiptNo)}
          </div>
        </section>

        <section class="info-card">
          <div class="card-title">รายละเอียดการจ่าย</div>
          <div class="info-grid">
            ${infoRow("วิธีจ่าย :", data.paymentMethod)}
            ${infoRow("เลขอ้างอิง :", data.transactionRef)}
            ${infoRow("บัญชีรับโอน :", data.bankInfo)}
          </div>
        </section>
      </div>`;
}

/** หัวหน้าถัดไป — คนอ่านต้องรู้ว่ากระดาษแผ่นนี้เป็นของใบสำคัญจ่ายใบไหน */
function contStripHtml(data: RawTirePaymentVoucherPdfData) {
  return `
      <div class="cont-strip">
        <span class="cont-title">ใบสำคัญจ่าย / Payment Voucher</span>
        <span class="cont-no">เลขที่ ${escapeHtml(data.voucherNo)} · ${escapeHtml(dash(data.voucherDate))}</span>
      </div>`;
}

/** กล่องยอดเงินเด่น — จัดสีตาม PO แล้ว ไม่ใช้เขียวมรกตของเดิม */
function heroHtml(data: RawTirePaymentVoucherPdfData) {
  return `
      <div class="hero">
        <div class="hero-label">จำนวนเงินที่จ่าย</div>
        <div class="hero-value">${escapeHtml(data.amount)} <span>บาท</span></div>
      </div>`;
}

function theadHtml() {
  return `
        <div class="tr thead">
          <div class="cell center">ลำดับ</div>
          <div class="cell center">รหัส</div>
          <div class="cell cell-name">รายการ</div>
          <div class="cell center">หน่วย</div>
          <div class="cell right">จำนวนเงิน</div>
        </div>`;
}

function rowHtml(data: RawTirePaymentVoucherPdfData) {
  return `
        <div class="tr tbody">
          <div class="cell center">1</div>
          <div class="cell center">PAY</div>
          <div class="cell cell-name">จ่ายค่าซื้อยางตามใบรับซื้อ ${escapeHtml(data.receiptNo)}</div>
          <div class="cell center">บาท</div>
          <div class="cell right">${escapeHtml(data.amount)}</div>
        </div>`;
}

function totalsHtml(data: RawTirePaymentVoucherPdfData) {
  return `
      <div class="totals">
        <div class="tot-row grand">
          <div class="k">ยอดจ่ายสุทธิ:</div>
          <div class="v">${escapeHtml(data.amount)}</div>
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
            <div>ผู้จ่าย (Paid By)</div>
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
        min-height: 78px;
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

      /* กล่องยอดเงินเด่น — โทนเดียวกับแถวยอดสุทธิของ PO */
      .hero {
        margin-top: 14px;
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        background: #f2f8ec;
        padding: 12px 14px;
        text-align: center;
        flex-shrink: 0;
      }

      .hero-label {
        font-size: 8px;
        color: #343434;
        font-weight: 700;
        margin-bottom: 5px;
      }

      .hero-value {
        font-size: 21px;
        color: #73b645;
        font-weight: 700;
        line-height: 1.1;
      }

      .hero-value span {
        font-size: 10px;
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
        grid-template-columns: 34px 60px 1fr 60px 96px;
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
      }

      .tot-row .k { color: #343434; }
      .tot-row .v {
        text-align: right;
        color: #7A7A7A;
        font-weight: 700;
      }

      .grand {
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

      /* ไม่ตัดข้อความทิ้ง — ยาวเกินหน้าให้ตัวจัดหน้าหั่นไหลไปหน้าถัดไปแทน */
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
  hero: number;
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
 * margin มาด้วย ซึ่ง `getBoundingClientRect()` ให้ไม่ได้
 */
function buildProbe(
  data: RawTirePaymentVoucherPdfData,
  paragraphs: string[],
): Probe {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = `${PAGE_WIDTH}px`;
  root.style.background = "#fff";

  const mark = (id: number) => `<span class="pm" data-pm="${id}"></span>`;

  root.innerHTML = `
    ${createStyle()}
    <div class="page probe" id="rv-probe">
      ${mark(0)}${headHtml()}
      ${mark(1)}${firstBlockHtml(data)}
      ${mark(2)}${contStripHtml(data)}
      ${mark(3)}${heroHtml(data)}
      ${mark(4)}${totalsHtml(data)}
      ${mark(5)}${noteHeadHtml()}
      ${mark(6)}${pageEndHtml()}
      ${mark(7)}${footBarHtml(0, 1, false)}
      ${mark(8)}
      <div class="table" id="rv-probe-table">
        ${theadHtml()}${rowHtml(data)}
      </div>
      <div id="rv-probe-notes">
        ${paragraphs.map((text) => noteChunkHtml(text)).join("")}
      </div>
      <div class="note-value" id="rv-probe-scratch"></div>
    </div>
  `;

  document.body.appendChild(root);

  const marks = Array.from(root.querySelectorAll<HTMLElement>(".pm")).sort(
    (a, b) => Number(a.dataset.pm) - Number(b.dataset.pm),
  );
  const span = (from: number, to: number) =>
    marks[to].offsetTop - marks[from].offsetTop;

  const table = root.querySelector<HTMLElement>("#rv-probe-table")!;
  const notes = root.querySelector<HTMLElement>("#rv-probe-notes")!;
  const scratch = root.querySelector<HTMLElement>("#rv-probe-scratch")!;

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
      hero: span(3, 4),
      totals: span(4, 5),
      noteHead: span(5, 6),
      pageEnd: span(6, 7),
      foot: span(7, 8),
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
  hasHero: boolean;
  hasTable: boolean;
  hasPageEnd: boolean;
};

function buildPages(
  data: RawTirePaymentVoucherPdfData,
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
      hasHero: false,
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
        `ใบสำคัญจ่าย ${data.voucherNo}: จัดหน้าเกิน ${MAX_PAGES} หน้า — เนื้อหายาวผิดปกติ`,
      );
    }
    page = newPage();
  };

  // 1) กล่องยอดเงิน — อยู่หน้าแรกเสมอ
  page.hasHero = true;
  page.used += m.hero;

  // 2) รายการจ่าย
  const rows = [rowHtml(data)];
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

  // 3) ยอดรวม — ยกทั้งก้อน ห้ามตัดครึ่ง
  if (page.used > 0 && m.totals > free()) {
    nextPage();
  }
  page.tail.push(totalsHtml(data));
  page.used += m.totals;

  // 4) หมายเหตุ — หัวข้อต้องมีอย่างน้อยหนึ่งบรรทัดตามหลัง ไม่งั้นยกไปหน้าใหม่
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

  // 5) ลายเซ็น — ก้อนเดียวจบ อยู่หน้าสุดท้ายเสมอ
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
      ${draft.hasHero ? heroHtml(data) : ""}
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
export async function buildRawTirePaymentVoucherPagesHtml(
  data: RawTirePaymentVoucherPdfData,
) {
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

export async function generateRawTirePaymentVoucherPdf(
  data: RawTirePaymentVoucherPdfData,
) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const pagesHtml = await buildRawTirePaymentVoucherPagesHtml(data);

  await openMultiPagePdfFromHtml(PAGE_ID, pagesHtml, {
    wrapperWidth: `${PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}
