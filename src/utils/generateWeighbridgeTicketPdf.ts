import {
  companyBrandName,
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  openMultiPagePdfFromHtml,
} from "./pdf-common";

import type { ReceiptDetail } from "@/types/raw-tire-purchase-receipt";
import { DEDUCTION_TYPE_LABELS } from "@/types/raw-tire-purchase-receipt";
import type { WeighbridgeTicketDetail } from "@/types/weighbridge-tickets";

export type WeighbridgeTicketPdfItem = {
  code: string;
  name: string;
  weightKg: string;
  pricePerKg: string;
  amount: string;
  description?: string;
};

export type WeighbridgeTicketPdfDeduction = {
  typeLabel: string;
  weightKg: string;
  amount: string;
  description: string;
};

export type WeighbridgeTicketPdfData = {
  ticketNo: string;
  ticketType: string;
  tradeType: string;
  licensePlate: string;
  driverName: string;
  sellerCode: string;
  sellerName: string;
  scaleName: string;
  weighInDate: string;
  weighInTime: string;
  weighOutDate: string;
  weighOutTime: string;
  grossWeightKg: string;
  tareWeightKg: string;
  deductionWeightKg: string;
  netWeightKg: string;
  payableWeightKg: string;
  receiptNo: string;
  items: WeighbridgeTicketPdfItem[];
  deductions: WeighbridgeTicketPdfDeduction[];
  avgPricePerKg: string;
  subtotalAmount: string;
  deductionAmount: string;
  totalAmount: string;
  isPaid: boolean;
  remark: string;
};

const PAGE_ID = "weighbridge-ticket-pdf";

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

function formatWeight(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "-");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "-");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPrice(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "-");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function splitDateTime(value?: string) {
  if (!value) return { date: "-", time: "-" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: value, time: "-" };
  }
  return {
    date: date.toLocaleDateString("th-TH"),
    time: date.toLocaleTimeString("th-TH", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function ticketTypeLabel(ticketType?: string) {
  if (!ticketType) return "ทั่วไป";
  if (ticketType === "RAW_TIRE" || ticketType === "PURCHASE")
    return "รับซื้อยาง";
  return ticketType;
}

export function mapWeighbridgeTicketToPdfData(params: {
  ticket: WeighbridgeTicketDetail;
  receipt?: ReceiptDetail | null;
  isPaid?: boolean;
}): WeighbridgeTicketPdfData {
  const { ticket, receipt, isPaid } = params;
  const weighIn = splitDateTime(ticket.weighInAt ?? ticket.createdAt);
  const weighOut = splitDateTime(ticket.weighOutAt);

  const items: WeighbridgeTicketPdfItem[] = (receipt?.items ?? []).map(
    (item) => ({
      code: item.classificationCode || "-",
      name: item.classificationName || item.description || "-",
      weightKg: formatWeight(item.weightKg),
      pricePerKg: formatPrice(item.pricePerKg),
      amount: formatMoney(item.amount),
      description: item.description || "",
    }),
  );

  const deductions: WeighbridgeTicketPdfDeduction[] = (
    receipt?.deductions ?? []
  ).map((row) => ({
    typeLabel: DEDUCTION_TYPE_LABELS[row.deductionType] ?? row.deductionType,
    weightKg: formatWeight(row.deductionWeightKg),
    amount: formatMoney(row.deductionAmount),
    description: row.description || "",
  }));

  const payableWeight =
    receipt?.payableWeightKg ??
    receipt?.summary?.payableWeightKg ??
    ticket.netWeightKg;
  const totalAmount = receipt?.totalAmount ?? receipt?.summary?.totalAmount;
  const subtotal = receipt?.subtotalAmount ?? receipt?.summary?.subtotalAmount;
  const deductionAmount =
    receipt?.deductionAmount ?? receipt?.summary?.deductionAmount;
  const deductionWeight =
    receipt?.deductionWeightKg ?? receipt?.summary?.deductionWeightKg ?? "0";

  const avgPrice =
    Number(payableWeight) > 0 && Number(subtotal ?? 0) > 0
      ? formatPrice(Number(subtotal) / Number(payableWeight))
      : items.length === 1
        ? items[0].pricePerKg
        : "-";

  const plate = [ticket.truckLicensePlate, ticket.truckProvince]
    .filter(Boolean)
    .join(" ");

  return {
    ticketNo: ticket.ticketNo,
    ticketType: ticketTypeLabel(ticket.ticketType),
    tradeType: "ซื้อ",
    licensePlate: plate || "-",
    driverName: ticket.driverName || receipt?.ticket?.driverName || "-",
    sellerCode: ticket.sellerCode || receipt?.seller.sellerCode || "-",
    sellerName: ticket.sellerName || receipt?.seller.sellerName || "-",
    scaleName:
      [ticket.scaleCode, ticket.scaleName].filter(Boolean).join(" — ") || "-",
    weighInDate: weighIn.date,
    weighInTime: weighIn.time,
    weighOutDate: weighOut.date,
    weighOutTime: weighOut.time,
    grossWeightKg: formatWeight(ticket.grossWeightKg),
    tareWeightKg: formatWeight(ticket.tareWeightKg),
    deductionWeightKg: formatWeight(deductionWeight),
    netWeightKg: formatWeight(ticket.netWeightKg),
    payableWeightKg: formatWeight(payableWeight),
    receiptNo: receipt?.receiptNo || ticket.receiptNo || "-",
    items,
    deductions,
    avgPricePerKg: avgPrice,
    subtotalAmount: formatMoney(subtotal ?? 0),
    deductionAmount: formatMoney(deductionAmount ?? 0),
    totalAmount: formatMoney(totalAmount ?? 0),
    isPaid: Boolean(isPaid || ticket.receiptPaymentStatus === "PAID"),
    remark: receipt?.remark || ticket.remark || "",
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

function firstBlockHtml(data: WeighbridgeTicketPdfData) {
  return `
      <div class="headrow">
        <div class="titlebox">
          <div class="title-th">ตั๋วชั่ง</div>
          <div class="title-en">Weighbridge Ticket · ${escapeHtml(data.ticketType)}</div>
        </div>
        <div class="docbox docbox-3">
          <div>
            <div class="doclabel">เลขที่ตั๋ว</div>
            <div class="docval">${escapeHtml(data.ticketNo)}</div>
          </div>
          <div>
            <div class="doclabel">ใบรับซื้อ</div>
            <div class="docval">${escapeHtml(dash(data.receiptNo))}</div>
          </div>
          <div>
            <div class="doclabel">สถานะจ่ายเงิน</div>
            <div class="docval">
              <span class="chip ${data.isPaid ? "chip-ok" : "chip-warn"}">${
                data.isPaid ? "จ่ายแล้ว" : "รอจ่าย"
              }</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section-rule"></div>

      <div class="info-wrap">
        <section class="info-card">
          <div class="card-title">ผู้ขาย / รถ</div>
          <div class="info-grid">
            ${infoRow("ชื่อผู้ขาย :", data.sellerName)}
            ${infoRow("รหัสผู้ขาย :", data.sellerCode)}
            ${infoRow("ทะเบียนรถ :", data.licensePlate)}
            ${infoRow("คนขับ :", data.driverName)}
          </div>
        </section>

        <section class="info-card">
          <div class="card-title">เวลาชั่ง / เครื่องชั่ง</div>
          <div class="info-grid">
            ${infoRow("เครื่องชั่ง :", data.scaleName)}
            ${infoRow("วันที่เข้า :", `${data.weighInDate} ${data.weighInTime}`)}
            ${infoRow("วันที่ออก :", `${data.weighOutDate} ${data.weighOutTime}`)}
            ${infoRow("ราคาเฉลี่ย :", `${data.avgPricePerKg} บ./กก.`)}
          </div>
        </section>
      </div>`;
}

/** แถบน้ำหนัก 4 ช่อง — เอกลักษณ์ของตั๋วชั่ง จัดสีใหม่ตาม PO แล้ว */
function weightsHtml(data: WeighbridgeTicketPdfData) {
  return `
      <div class="weights">
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักเข้า</div>
          <div class="weight-value">${escapeHtml(data.grossWeightKg)}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักออก</div>
          <div class="weight-value">${escapeHtml(data.tareWeightKg)}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักหัก</div>
          <div class="weight-value">${escapeHtml(data.deductionWeightKg)}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell highlight">
          <div class="weight-label">น้ำหนักจ่ายจริง</div>
          <div class="weight-value">${escapeHtml(data.payableWeightKg)}</div>
          <div class="weight-unit">สุทธิชั่ง ${escapeHtml(data.netWeightKg)} กก.</div>
        </div>
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

function itemRowHtml(item: WeighbridgeTicketPdfItem, no: number) {
  return `
        <div class="tr tbody">
          <div class="cell center">${no}</div>
          <div class="cell center">${escapeHtml(item.code)}</div>
          <div class="cell cell-name">
            <div>${escapeHtml(item.name)}</div>
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

/** แถวรายการหัก — เลขลำดับต่อจากรายการสินค้า และยอดเป็นค่าติดลบ */
function deductionRowHtml(row: WeighbridgeTicketPdfDeduction, no: number) {
  return `
        <div class="tr tbody">
          <div class="cell center">${no}</div>
          <div class="cell center"><span class="badge-warn">หัก</span></div>
          <div class="cell cell-name">
            <div>${escapeHtml(row.typeLabel)}</div>
            ${
              row.description
                ? `<div class="sub-line">${escapeHtml(row.description)}</div>`
                : ""
            }
          </div>
          <div class="cell right">${escapeHtml(row.weightKg)}</div>
          <div class="cell center">-</div>
          <div class="cell right warn-text">-${escapeHtml(row.amount)}</div>
        </div>`;
}

/** ยังไม่ได้คัดแยก — ต้องบอกให้รู้ ไม่ใช่ปล่อยตารางว่างเปล่า */
function emptyRowHtml() {
  return `
        <div class="tr tbody">
          <div class="cell empty-hint">ยังไม่มีรายการคัดแยก</div>
        </div>`;
}

/** รายการสินค้ากับรายการหักอยู่ตารางเดียวกัน เลขลำดับไหลต่อเนื่อง */
function allRowsHtml(data: WeighbridgeTicketPdfData) {
  if (data.items.length === 0 && data.deductions.length === 0) {
    return [emptyRowHtml()];
  }
  return [
    ...data.items.map((item, index) => itemRowHtml(item, index + 1)),
    ...data.deductions.map((row, index) =>
      deductionRowHtml(row, data.items.length + index + 1),
    ),
  ];
}

function totalsHtml(data: WeighbridgeTicketPdfData) {
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
            <div>ผู้ชั่ง (Weighed By)</div>
            <div class="line"></div>
            <div class="date">วันที่ ___/___/___</div>
          </div>
          <div class="sig">
            <div>ผู้ตรวจ (Checked By)</div>
            <div class="line"></div>
            <div class="date">วันที่ ___/___/___</div>
          </div>
          <div class="sig">
            <div>ผู้ขาย (Seller)</div>
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
        margin-left: 40px;
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

      /* ใบนี้มีช่องสถานะจ่ายเงินเพิ่มมาอีกช่อง จึงกว้างกว่าใบอื่น */
      .docbox-3 {
        width: 300px;
        grid-template-columns: 1fr 1fr 1fr;
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

      /* ชิพสถานะจ่ายเงิน — โทนเดียวกับ PO ไม่ใช้เขียวมรกต/ส้มสดของเดิม */
      .chip {
        display: inline-block;
        border-radius: 5px;
        padding: 2px 7px;
        font-size: 7px;
        font-weight: 700;
      }

      .chip-ok {
        background: #f2f8ec;
        color: #73b645;
      }

      .chip-warn {
        background: #fdf6e8;
        color: #b0821f;
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
        min-height: 92px;
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

      /* แถบน้ำหนัก 4 ช่อง */
      .weights {
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border: 1px solid #D8DCE0;
        border-radius: 5px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .weight-cell {
        padding: 8px 6px 9px;
        text-align: center;
        border-right: 1px solid #D8DCE0;
      }

      .weight-cell:last-child { border-right: none; }
      .weight-cell.highlight { background: #f2f8ec; }

      .weight-label {
        font-size: 7px;
        color: #7A7A7A;
      }

      .weight-value {
        margin-top: 4px;
        font-size: 13px;
        font-weight: 700;
        color: #343434;
      }

      .weight-cell.highlight .weight-value { color: #73b645; }

      .weight-unit {
        margin-top: 2px;
        font-size: 6.5px;
        color: #7A7A7A;
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
        grid-template-columns: 34px 70px 1fr 74px 68px 80px;
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

      .empty-hint {
        grid-column: 1 / -1;
        text-align: center;
        color: #7A7A7A;
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
  weights: number;
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
function buildProbe(data: WeighbridgeTicketPdfData, paragraphs: string[]): Probe {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = `${PAGE_WIDTH}px`;
  root.style.background = "#fff";

  const mark = (id: number) => `<span class="pm" data-pm="${id}"></span>`;

  root.innerHTML = `
    ${createStyle()}
    <div class="page probe" id="wb-probe">
      ${mark(0)}${headHtml()}
      ${mark(1)}${firstBlockHtml(data)}
      ${mark(2)}${contStripHtml(data)}
      ${mark(3)}${weightsHtml(data)}
      ${mark(4)}${totalsHtml(data)}
      ${mark(5)}${noteHeadHtml()}
      ${mark(6)}${pageEndHtml()}
      ${mark(7)}${footBarHtml(0, 1, false)}
      ${mark(8)}
      <div class="table" id="wb-probe-table">
        ${theadHtml()}${allRowsHtml(data).join("")}
      </div>
      <div id="wb-probe-notes">
        ${paragraphs.map((text) => noteChunkHtml(text)).join("")}
      </div>
      <div class="note-value" id="wb-probe-scratch"></div>
    </div>
  `;

  document.body.appendChild(root);

  const marks = Array.from(root.querySelectorAll<HTMLElement>(".pm")).sort(
    (a, b) => Number(a.dataset.pm) - Number(b.dataset.pm),
  );
  const span = (from: number, to: number) =>
    marks[to].offsetTop - marks[from].offsetTop;

  const table = root.querySelector<HTMLElement>("#wb-probe-table")!;
  const notes = root.querySelector<HTMLElement>("#wb-probe-notes")!;
  const scratch = root.querySelector<HTMLElement>("#wb-probe-scratch")!;

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
      weights: span(3, 4),
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
  hasWeights: boolean;
  hasTable: boolean;
  hasPageEnd: boolean;
};

function buildPages(
  data: WeighbridgeTicketPdfData,
  probe: Probe,
  paragraphs: string[],
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
      hasWeights: false,
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
        `ตั๋วชั่ง ${data.ticketNo}: จัดหน้าเกิน ${MAX_PAGES} หน้า — เนื้อหายาวผิดปกติ`,
      );
    }
    page = newPage();
  };

  // 1) แถบน้ำหนัก — อยู่หน้าแรกเสมอ
  page.hasWeights = true;
  page.used += m.weights;

  // 2) รายการสินค้า + รายการหัก — ตัดได้ระหว่างแถวเท่านั้น หัวตารางซ้ำทุกหน้า
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
      ${draft.hasWeights ? weightsHtml(data) : ""}
      ${tableBlock}
      ${draft.tail.join("")}
      ${footBarHtml(draft.index, pageCount, !draft.hasPageEnd)}
    </div>`;

    // สไตล์แนบไปกับหน้าแรก ทุกหน้าอยู่ wrapper เดียวกันจึงใช้ร่วมกันได้
    return draft.index === 0 ? `${createStyle()}${body}` : body;
  });
}

/** หัวหน้าถัดไป — คนอ่านต้องรู้ว่ากระดาษแผ่นนี้เป็นของตั๋วใบไหน */
function contStripHtml(data: WeighbridgeTicketPdfData) {
  return `
      <div class="cont-strip">
        <span class="cont-title">ตั๋วชั่ง / Weighbridge Ticket</span>
        <span class="cont-no">เลขที่ ${escapeHtml(data.ticketNo)} · ${escapeHtml(dash(data.receiptNo))}</span>
      </div>`;
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
export async function buildWeighbridgeTicketPagesHtml(
  data: WeighbridgeTicketPdfData,
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

export async function generateWeighbridgeTicketPdf(
  data: WeighbridgeTicketPdfData,
) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const pagesHtml = await buildWeighbridgeTicketPagesHtml(data);

  await openMultiPagePdfFromHtml(PAGE_ID, pagesHtml, {
    wrapperWidth: `${PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}
