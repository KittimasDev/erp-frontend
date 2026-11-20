import {
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  formatMoney,
  formatQty,
  openMultiPagePdfFromHtml,
} from "./pdf-common";
import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";
import { getUserSignatureDataUrl } from "@/lib/user/user-signature";
import {
  SALES_ORDER_PAYMENT_METHOD_LABEL,
  type SalesOrderPaymentMethod,
} from "@/types/sales-orders";
import {
  vatPdfLineLabel,
  withVatPercentLabel,
  VAT_MODE_LABEL,
  resolveVatMode,
  type VatMode,
} from "@/lib/money/vat-totals";

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

export type PurchaseOrderPdfRoundItem = {
  itemCode: string;
  itemName: string;
  qty: number;
  unit: string;
};

export type PurchaseOrderPdfRound = {
  roundNo: number;
  deliveryDate: string;
  /** วันกำหนดส่งก่อนเลื่อน — มีค่าเมื่อรอบนี้ถูกเลื่อนแล้ว */
  originalDeliveryDate?: string;
  items: PurchaseOrderPdfRoundItem[];
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
  vatMode?: VatMode | string;
  vatRate?: number;
  withholdingTaxLabel: string;
  paymentMethodLabel: string;
  createdBy: string;
  createdByPhone: string;
  expectedDeliveryDate: string;
  customerPoNo?: string;
  customerPoDate?: string;
  quotationNo?: string;
  paymentDueDate?: string;
  withholdingTaxAmount?: number;
  preparedBySignature?: string | null;
  approvedBySignature?: string | null;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  afterDiscount?: number;
  /** VAT รวมทั้งค่าสินค้าและค่าใช้จ่ายเพิ่มเติม */
  vatAmount: number;
  /** ยอดสุทธิทั้งใบ = ค่าสินค้า + ค่าใช้จ่ายเพิ่มเติม + VAT */
  totalAmount: number;
  /** ค่าใช้จ่ายเพิ่มเติม (แยกจากรายการสินค้า ไม่เข้าสต๊อก) — ไม่มี = ไม่แสดง */
  charges?: Array<{
    typeLabel: string;
    description: string;
    amountBeforeVat: number;
    vatAmount: number;
  }>;
  items: PurchaseOrderPdfItem[];
  deliveryRounds?: PurchaseOrderPdfRound[];
};

function activeDeliveryRounds(data: PurchaseOrderPdfData): PurchaseOrderPdfRound[] {
  return (data.deliveryRounds ?? []).filter((round) => round.items.length > 0);
}

const PAGE_ID = "sales-order-pdf";

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

function infoRow(label: string, value?: string) {
  return `<div class="k">${escapeHtml(label)}</div><div class="v">${escapeHtml(dash(value))}</div>`;
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
          <strong>ใบสั่งขาย</strong>
          <small>SALES ORDER</small>
        </div>
      </header>`;
}

function firstBlockHtml(data: PurchaseOrderPdfData) {
  return `
      <div class="doc-meta">
        <div class="meta-cell">
          <span class="label">เลขที่ใบสั่งขาย / SO No.</span>
          <span class="value">${escapeHtml(data.poNo)}</span>
        </div>
        <div class="meta-cell">
          <span class="label">วันที่เอกสาร</span>
          <span class="value">${escapeHtml(data.poDate)}</span>
        </div>
        <div class="meta-cell">
          <span class="label">กำหนดส่งครั้งแรก</span>
          <span class="value">${escapeHtml(dash(data.expectedDeliveryDate))}</span>
        </div>
      </div>
      <div class="info">
        <section class="info-panel">
          <h2>ข้อมูลลูกค้า</h2>
          <div class="kv">
            ${infoRow("ลูกค้า", data.vendorName)}
            ${infoRow("รหัสลูกค้า", data.vendorCode)}
            ${infoRow("เลขผู้เสียภาษี", data.vendorTaxId)}
            ${infoRow("ที่อยู่", data.vendorAddress)}
            ${infoRow("โทรศัพท์", data.vendorPhone)}
            ${infoRow("ผู้ติดต่อ", data.vendorContact)}
          </div>
        </section>
        <section class="info-panel">
          <h2>ข้อมูลการสั่งขาย</h2>
          <div class="kv">
            ${infoRow("เงื่อนไขชำระเงิน", data.paymentTerm)}
            ${infoRow("วิธีชำระเงิน", data.paymentMethodLabel)}
            ${infoRow("รูปแบบ VAT", data.taxRateLabel)}
            ${infoRow("ภาษีหัก ณ ที่จ่าย", data.withholdingTaxLabel)}
            ${infoRow("ผู้ติดต่อภายใน", data.createdBy)}
            ${infoRow("เบอร์โทร", data.createdByPhone)}
            ${infoRow("เลข PO ลูกค้า", data.customerPoNo)}
            ${infoRow("วันที่เอกสาร PO", data.customerPoDate)}
            ${infoRow("อ้างอิง QT", data.quotationNo)}
            ${infoRow("ครบกำหนดชำระ", data.paymentDueDate)}
          </div>
        </section>
      </div>
      <div class="section-heading">
        <h2>รายการสินค้า</h2>
        <span>สกุลเงิน: บาท (THB)</span>
      </div>`;
}

/** หัวหน้าถัดไป — คนอ่านต้องรู้ว่ากระดาษแผ่นนี้เป็นของใบสั่งซื้อใบไหน */
function contStripHtml(data: PurchaseOrderPdfData) {
  return `
      <div class="cont-strip">
        <span class="cont-title">ใบสั่งขาย / Sales Order</span>
        <span class="cont-no">เลขที่ ${escapeHtml(data.poNo)} · ${escapeHtml(data.poDate)}</span>
      </div>`;
}

function theadHtml() {
  return `
        <div class="tr thead">
          <div class="cell center">#</div>
          <div class="cell">รหัสสินค้า</div>
          <div class="cell cell-name">รายละเอียดสินค้า</div>
          <div class="cell center">หน่วย</div>
          <div class="cell right">จำนวน</div>
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

function scheduleSectionHeadHtml() {
  return `<div class="sched-section-head"><h2>กำหนดการจัดส่งสินค้า</h2></div>`;
}

function scheduleDateLabel(round: PurchaseOrderPdfRound) {
  return round.originalDeliveryDate
    ? `${round.originalDeliveryDate} เลื่อนเป็น ${round.deliveryDate}`
    : round.deliveryDate;
}

function scheduleTheadHtml() {
  return `
        <div class="tr thead sched">
          <div class="cell center">รอบ</div>
          <div class="cell">กำหนดส่ง</div>
          <div class="cell">รหัสสินค้า</div>
          <div class="cell cell-name">รายการสินค้า</div>
          <div class="cell right">จำนวน</div>
          <div class="cell center">หน่วย</div>
        </div>`;
}

function scheduleRowHtml(
  round: PurchaseOrderPdfRound,
  item: PurchaseOrderPdfRoundItem,
) {
  return `
        <div class="tr tbody sched">
          <div class="cell center">${round.roundNo}</div>
          <div class="cell">${escapeHtml(scheduleDateLabel(round))}</div>
          <div class="cell code">${escapeHtml(item.itemCode)}</div>
          <div class="cell cell-name">${escapeHtml(item.itemName)}</div>
          <div class="cell right">${formatQty(item.qty)}</div>
          <div class="cell center">${escapeHtml(item.unit)}</div>
        </div>`;
}

function scheduleTableHtml(rows: string[]) {
  return `<div class="table schedule-table">${scheduleTheadHtml()}${rows.join("")}</div>`;
}

/** ค่าใช้จ่ายเพิ่มเติม: แถวละรายการ (ก่อน VAT) + แถวรวม — แยกจากค่าสินค้า */
function chargeRowsHtml(data: PurchaseOrderPdfData) {
  const charges = data.charges ?? [];
  if (!charges.length) return "";
  const total = charges.reduce((sum, c) => sum + c.amountBeforeVat, 0);
  const lines = charges
    .map(
      (c) => `
        <div class="tot-row">
          <div class="k">${escapeHtml(c.typeLabel)}: ${escapeHtml(c.description)}</div>
          <div class="v">${formatMoney(c.amountBeforeVat)}</div>
        </div>`,
    )
    .join("");
  return `${lines}
        <div class="tot-row">
          <div class="k">ค่าใช้จ่ายเพิ่มเติมรวม (ก่อน VAT):</div>
          <div class="v">${formatMoney(total)}</div>
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
${chargeRowsHtml(data)}
        <div class="tot-row">
          <div class="k">${vatPdfLineLabel(data.vatMode, data.vatRate)}:</div>
          <div class="v">${formatMoney(data.vatAmount)}</div>
        </div>
        ${
          data.withholdingTaxAmount && data.withholdingTaxAmount > 0
            ? `<div class="tot-row">
          <div class="k">${escapeHtml(data.withholdingTaxLabel || "ภาษีหัก ณ ที่จ่าย")}:</div>
          <div class="v">${formatMoney(data.withholdingTaxAmount)}</div>
        </div>`
            : ""
        }
        <div class="tot-row grand">
          <div class="k">ยอดสุทธิ</div>
          <div class="v">${formatMoney(data.totalAmount)} บาท</div>
        </div>
      </div>`;
}

function noteHeadHtml() {
  return `
      <div class="note-rule"></div>
      <div class="note-title">หมายเหตุ :</div>`;
}

function noteChunkHtml(html: string) {
  return `<div class="note-html">${html}</div>`;
}

function signatureSlot(
  role: string,
  signature?: string | null,
) {
  const image = signature
    ? `<img src="${signature}" alt="" />`
    : "";
  return `
          <div class="sig">
            <div class="sig-line">${image}</div>
            <div class="role">${role}</div>
            <div class="date">วันที่ _____/_____/_____</div>
          </div>`;
}

function pageEndHtml(data?: PurchaseOrderPdfData) {
  return `
      <div class="page-end">
        <div class="signatures">
          ${signatureSlot("ผู้จัดทำ", data?.preparedBySignature)}
          ${signatureSlot("ผู้ตรวจสอบ")}
          ${signatureSlot("ผู้อนุมัติ", data?.approvedBySignature)}
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

      .logo,
      .symbol {
        width: 42px;
        height: 42px;
        object-fit: contain;
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
        grid-template-columns: 1.3fr 1fr 1fr;
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

      .label {
        color: #66727d;
        font-size: 8px;
        display: block;
        margin-bottom: 2px;
      }

      .meta-cell .value {
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
        color: #78b64c;
        font-weight: 700;
      }

      .cont-no {
        font-size: 8px;
        color: #343434;
        font-weight: 700;
      }

      .info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 10px;
        flex-shrink: 0;
      }

      .info-panel {
        border: 1px solid #d5dce1;
        border-radius: 6px;
        padding: 8px 9px;
      }

      .info-panel h2,
      .section-heading h2,
      .sched-section-head h2 {
        font-size: 10px;
        margin: 0 0 6px;
        color: #253626;
        font-weight: 700;
      }

      .kv {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 2px 6px;
        font-size: 8.5px;
      }

      .kv .k { color: #66727d; }
      .kv .v {
        font-weight: 500;
        color: #263039;
        overflow-wrap: anywhere;
      }

      .section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 12px 0 0;
        flex-shrink: 0;
      }

      .section-heading h2 { margin: 0; }

      .section-heading span {
        font-size: 8px;
        color: #66727d;
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
        grid-template-columns: 22px 68px 1fr 32px 36px 58px 42px 54px;
        align-items: start;
      }

      .cell-name {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .thead {
        background: #edf0ee;
        min-height: 26px;
        font-size: 7.6px;
        color: #35413b;
        font-weight: 700;
      }

      .tbody {
        min-height: 24px;
        font-size: 8px;
        color: #263039;
        border-top: 1px solid #d5dce1;
      }

      .code { font-size: 7.5px; color: #66727d; }

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

      .sched-section-head {
        margin-top: 12px;
        flex-shrink: 0;
      }

      .sched-section-head h2 { margin: 0; }

      .table.schedule-table {
        margin-top: 6px;
      }

      .tr.sched {
        grid-template-columns: 28px 78px 68px 1fr 36px 32px;
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
        margin: 4px -4px -2px;
        background: #f1f7ed;
        color: #315e24;
        border-radius: 4px;
        padding: 5px 4px;
        font-size: 10px;
        font-weight: 800;
      }

      .grand .k,
      .grand .v {
        color: #315e24;
        font-weight: 800;
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

      .note-html {
        font-size: 8px;
        color: #7A7A7A;
        line-height: 1.4;
        word-break: break-word;
        overflow-wrap: anywhere;
        flex-shrink: 0;
      }

      .note-html p { margin: 0 0 3px; }
      .note-html p:last-child { margin-bottom: 0; }

      .note-html ul,
      .note-html ol {
        margin: 0 0 3px;
        padding-left: 13px;
      }

      .note-html h1 {
        margin: 0 0 4px;
        font-size: 11px;
        font-weight: 700;
        color: #343434;
        line-height: 1.3;
      }

      .note-html h2 {
        margin: 0 0 4px;
        font-size: 9.5px;
        font-weight: 700;
        color: #343434;
        line-height: 1.35;
      }

      .note-html ul[data-task] {
        list-style: none;
        padding-left: 2px;
      }

      .note-html ul[data-task] li {
        position: relative;
        padding-left: 12px;
      }

      .note-html ul[data-task] li::before {
        content: "☐";
        position: absolute;
        left: 0;
      }

      .note-html ul[data-task] li[data-checked="true"]::before {
        content: "☑";
      }

      .note-html s,
      .note-html strike,
      .note-html del {
        text-decoration: line-through;
      }

      .note-html pre {
        margin: 0 0 4px;
        padding: 5px 6px;
        background: #f4f4f3;
        border-radius: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 7.5px;
        white-space: pre-wrap;
      }

      .note-html code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 7.5px;
      }

      .page-end {
        margin-top: auto;
        flex-shrink: 0;
      }

      .signatures {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 18px;
        text-align: center;
      }

      .sig {
        text-align: center;
        color: #263039;
        font-size: 8px;
      }

      .sig-line {
        border-bottom: 1px solid #93999e;
        height: 36px;
        margin: 0 6px 4px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }

      .sig-line img {
        max-height: 32px;
        max-width: 120px;
        object-fit: contain;
      }

      .sig .role { font-weight: 700; }

      .sig .date {
        margin-top: 3px;
        color: #66727d;
        font-size: 7.5px;
      }

      .po-foot {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-top: 10px;
        padding-top: 5px;
        border-top: 1px solid #d5dce1;
        font-size: 7.5px;
        color: #66727d;
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
  schedSection: number;
  schedRoundHeads: number[];
  schedThead: number;
  schedRows: number[];
};

type Probe = {
  root: HTMLElement;
  /** ช่องวัดข้อความหมายเหตุระหว่างหาจุดตัด */
  scratch: HTMLElement;
  metrics: Metrics;
};

/** แตกหมายเหตุ rich text ตาม element ชั้นบนสุด — หั่นกลาง HTML ไม่ได้ */
function splitNoteHtmlChunks(html: string): string[] {
  const holder = document.createElement("div");
  holder.innerHTML = html;

  const chunks: string[] = [];
  for (const node of Array.from(holder.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim()) chunks.push(`<p>${escapeHtml(text)}</p>`);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if ((tag === "ul" || tag === "ol") && el.children.length > 1) {
      for (const li of Array.from(el.children)) {
        const clone = el.cloneNode(false) as HTMLElement;
        clone.appendChild(li.cloneNode(true));
        chunks.push(clone.outerHTML);
      }
      continue;
    }
    chunks.push(el.outerHTML);
  }

  return chunks.length > 0 ? chunks : [`<p>${escapeHtml("—")}</p>`];
}

/**
 * วัดทุกก้อนในรอบเดียว
 *
 * ใช้หมุดสูงศูนย์คั่นระหว่างก้อนแล้วอ่านส่วนต่างของ `offsetTop` — ได้ความสูงรวม
 * margin มาด้วย ซึ่ง `getBoundingClientRect()` ให้ไม่ได้ และก้อนอย่าง `.totals`
 * กับ `.rule` มี margin ที่กินที่จริงบนหน้ากระดาษ
 */
function buildProbe(data: PurchaseOrderPdfData, chunks: string[]): Probe {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = `${PAGE_WIDTH}px`;
  root.style.background = "#fff";

  const mark = (id: number) => `<span class="pm" data-pm="${id}"></span>`;
  const rounds = activeDeliveryRounds(data);

  root.innerHTML = `
    ${createStyle()}
    <div class="page probe" id="po-probe">
      ${mark(0)}${headHtml()}
      ${mark(1)}${firstBlockHtml(data)}
      ${mark(2)}${contStripHtml(data)}
      ${mark(3)}${totalsHtml(data)}
      ${mark(4)}${noteHeadHtml()}
      ${mark(5)}${pageEndHtml(data)}
      ${mark(6)}${footBarHtml(0, 1, false)}
      ${mark(7)}
      <div class="table" id="po-probe-table">
        ${theadHtml()}${data.items.map(rowHtml).join("")}
      </div>
      <div id="po-probe-notes">
        ${chunks.map((html) => noteChunkHtml(html)).join("")}
      </div>
      <div class="note-value" id="po-probe-scratch"></div>
      ${
        rounds.length
          ? `${scheduleSectionHeadHtml()}
      <div class="table schedule-table" id="po-probe-sched-table">
        ${scheduleTheadHtml()}${rounds.flatMap((round) => round.items.map((item) => scheduleRowHtml(round, item))).join("")}
      </div>`
          : ""
      }
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
  const schedHead = root.querySelector<HTMLElement>(".sched-section-head");
  const schedTable = root.querySelector<HTMLElement>("#po-probe-sched-table");

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
      schedSection: schedHead ? height(schedHead) + 12 : 0,
      schedRoundHeads: [],
      schedThead: schedTable
        ? height(schedTable.querySelector(".tr.thead")!)
        : 0,
      schedRows: schedTable
        ? Array.from(schedTable.querySelectorAll(".tr.tbody")).map(height)
        : [],
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
  data: PurchaseOrderPdfData,
  probe: Probe,
  chunks: string[],
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
        `ใบสั่งขาย ${data.poNo}: จัดหน้าเกิน ${MAX_PAGES} หน้า — เนื้อหายาวผิดปกติ`,
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

  const rounds = activeDeliveryRounds(data);
  if (rounds.length) {
    let openSchedRows: string[] = [];
    let schedRowIndex = 0;

    const flushScheduleTable = () => {
      if (!openSchedRows.length) {
        return;
      }
      page.tail.push(scheduleTableHtml(openSchedRows));
      openSchedRows = [];
    };

    const nextSchedulePage = () => {
      flushScheduleTable();
      nextPage();
    };

    if (page.used > 0 && m.schedSection > free()) {
      nextSchedulePage();
    }
    page.tail.push(scheduleSectionHeadHtml());
    page.used += m.schedSection;

    for (const round of rounds) {
      for (const item of round.items) {
        const rowHeight = m.schedRows[schedRowIndex] ?? 0;
        const tableCost = openSchedRows.length
          ? 0
          : m.schedThead + TABLE_CHROME;
        if (page.used > 0 && tableCost + rowHeight > free()) {
          nextSchedulePage();
        }
        if (!openSchedRows.length) {
          page.used += m.schedThead + TABLE_CHROME;
        }
        openSchedRows.push(scheduleRowHtml(round, item));
        page.used += rowHeight;
        schedRowIndex += 1;
      }
    }
    flushScheduleTable();
  }

  // 3) หมายเหตุ — หัวข้อต้องมีอย่างน้อยหนึ่งบรรทัดตามหลัง ไม่งั้นยกไปหน้าใหม่
  if (page.used > 0 && m.noteHead + m.noteLine > free()) {
    nextPage();
  }
  page.tail.push(noteHeadHtml());
  page.used += m.noteHead;

  for (let i = 0; i < chunks.length; i += 1) {
    const chunkHeight = m.paragraphs[i] ?? 0;
    if (page.used > 0 && chunkHeight > free()) {
      nextPage();
    }
    page.tail.push(noteChunkHtml(chunks[i]));
    page.used += chunkHeight;
  }

  // 4) ลายเซ็น — ก้อนเดียวจบ อยู่หน้าสุดท้ายเสมอ
  if (page.used > 0 && m.pageEnd > free()) {
    nextPage();
  }
  page.tail.push(pageEndHtml(data));
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

async function buildPurchaseOrderPagesHtml(data: PurchaseOrderPdfData) {
  // ต้องรอฟอนต์ก่อนวัด — Sarabun สูงกว่า fallback ถ้าวัดก่อนโหลดเสร็จหน้าจะล้น
  await waitForSarabun();

  const remarkHtml =
    sanitizeDocumentHtml(data.remark) || `<p>${escapeHtml("—")}</p>`;
  const chunks = splitNoteHtmlChunks(remarkHtml);
  const probe = buildProbe(data, chunks);

  try {
    return buildPages(data, probe, chunks);
  } finally {
    document.body.removeChild(probe.root);
  }
}

export type SalesOrderPdfRound = {
  roundNo: number;
  deliveryDate: string;
  originalDeliveryDate?: string;
  items: Array<{
    no?: number;
    itemCode: string;
    itemName: string;
    unit: string;
    qty: number;
    unitPrice?: number;
    discountAmount?: number;
    amount?: number;
  }>;
};

export type SalesOrderPdfData = {
  soNo: string;
  soDate: string;
  customerName: string;
  customerCode: string;
  customerTaxId?: string;
  customerAddress?: string;
  customerPhone?: string;
  contactName?: string;
  customerPoNo: string;
  customerPoDate?: string;
  quotationNo: string;
  paymentMethod?: string;
  paymentDueDate?: string;
  paymentTerm?: string;
  requestedDeliveryDate: string;
  remark: string;
  taxRatePercent?: number;
  vatMode?: string;
  withholdingTaxLabel?: string;
  withholdingTaxAmount?: number;
  createdByPhone?: string;
  revisedAt?: string;
  confirmedAt?: string;
  revisionNo?: number;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  items: Array<{
    no: number;
    itemCode: string;
    itemName: string;
    unit: string;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    amount: number;
  }>;
  rounds?: SalesOrderPdfRound[];
  isDraftPreview?: boolean;
  preparedBy?: { id?: string; name?: string };
  preparedBySignatureDataUrl?: string | null;
  approvedBy?: { id?: string; name?: string };
  approvedBySignatureDataUrl?: string | null;
};

function paymentMethodText(value?: string) {
  if (!value) return "—";
  return (
    SALES_ORDER_PAYMENT_METHOD_LABEL[value as SalesOrderPaymentMethod] ?? value
  );
}

export async function generateSalesOrderPdf(data: SalesOrderPdfData) {
  await ensureCompanyInfo();

  const preparedSignature =
    data.preparedBySignatureDataUrl !== undefined
      ? data.preparedBySignatureDataUrl
      : await getUserSignatureDataUrl(data.preparedBy?.id);
  const approvedSignature =
    data.approvedBySignatureDataUrl !== undefined
      ? data.approvedBySignatureDataUrl
      : await getUserSignatureDataUrl(data.approvedBy?.id);

  const vatMode = resolveVatMode(data.vatMode);
  const afterDiscount = Math.max(
    0,
    Number((data.subtotalAmount - data.discountAmount).toFixed(2)),
  );

  const pagesHtml = await buildPurchaseOrderPagesHtml({
    poNo: data.soNo,
    poDate: data.soDate,
    vendorName: data.customerName,
    vendorCode: data.customerCode,
    vendorTaxId: data.customerTaxId || "—",
    vendorAddress: data.customerAddress || "—",
    vendorPhone: data.customerPhone || "—",
    vendorContact: data.contactName || "—",
    paymentTerm: data.paymentTerm || "ไม่ระบุ",
    taxRateLabel: withVatPercentLabel(
      VAT_MODE_LABEL[vatMode] ?? "ไม่รวม VAT",
      data.taxRatePercent,
    ),
    vatMode,
    vatRate: data.taxRatePercent,
    withholdingTaxLabel: data.withholdingTaxLabel || "ไม่ระบุ",
    withholdingTaxAmount: data.withholdingTaxAmount,
    paymentMethodLabel: paymentMethodText(data.paymentMethod),
    createdBy: data.preparedBy?.name || "—",
    createdByPhone: data.createdByPhone || "—",
    expectedDeliveryDate: data.requestedDeliveryDate,
    customerPoNo: data.customerPoNo,
    customerPoDate: data.customerPoDate,
    quotationNo: data.quotationNo,
    paymentDueDate: data.paymentDueDate,
    preparedBySignature: preparedSignature,
    approvedBySignature: approvedSignature,
    remark: data.remark,
    subtotalAmount: data.subtotalAmount,
    discountAmount: data.discountAmount,
    afterDiscount,
    vatAmount: data.vatAmount,
    totalAmount: data.totalAmount,
    items: data.items,
    deliveryRounds: (data.rounds ?? []).map((round) => ({
      roundNo: round.roundNo,
      deliveryDate: round.deliveryDate,
      originalDeliveryDate: round.originalDeliveryDate,
      items: round.items.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        qty: item.qty,
        unit: item.unit,
      })),
    })),
  });

  await openMultiPagePdfFromHtml(PAGE_ID, pagesHtml, {
    wrapperWidth: `${PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}
