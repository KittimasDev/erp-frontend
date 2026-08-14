import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

const LOGO_URL = "/9315db73-509d-48a7-a8a8-deccea44bb93.png";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  if (ticketType === "RAW_TIRE" || ticketType === "PURCHASE") return "รับซื้อยาง";
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

function createStyle() {
  return `
    <style>
      * { box-sizing: border-box; }

      .pdf-page {
        width: 794px;
        min-height: 1123px;
        padding: 28px 30px 32px;
        background: #ffffff;
        color: #1f2937;
        font-family: Tahoma, "Noto Sans Thai", Arial, sans-serif;
        font-size: 12px;
        position: relative;
      }

      .header {
        display: grid;
        grid-template-columns: 168px 1fr;
        align-items: center;
        gap: 14px;
      }

      .logo {
        width: 168px;
        height: auto;
        object-fit: contain;
      }

      .company {
        text-align: center;
        padding-right: 40px;
      }

      .company-name {
        font-size: 19px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 6px;
        letter-spacing: 0.2px;
      }

      .company-address {
        font-size: 11px;
        line-height: 1.5;
        color: #4b5563;
        font-weight: 500;
      }

      .header-rule {
        margin-top: 14px;
        display: flex;
        height: 3px;
      }

      .header-rule span {
        display: block;
        height: 3px;
      }

      .header-rule .rule-green {
        flex: 1;
        background: #7cb82f;
      }

      .header-rule .rule-gold {
        flex: 1.15;
        background: #f0b429;
      }

      .title-block {
        text-align: center;
        margin-top: 16px;
      }

      .title {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        letter-spacing: 1px;
      }

      .title-sub {
        margin-top: 3px;
        font-size: 11px;
        color: #6b7280;
        letter-spacing: 0.6px;
      }

      .meta-bar {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
        align-items: stretch;
        gap: 10px;
      }

      .meta-item {
        display: flex;
        align-items: baseline;
        gap: 8px;
        border: 1.2px solid #d1d5db;
        background: #f9fafb;
        padding: 7px 12px;
        min-width: 188px;
      }

      .meta-label {
        font-size: 11px;
        color: #6b7280;
        font-weight: 600;
      }

      .meta-value {
        font-size: 13px;
        font-weight: 700;
        color: #111827;
      }

      .paid-badge,
      .unpaid-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 92px;
        padding: 7px 12px;
        border: 1.2px solid #d1d5db;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
      }

      .paid-badge {
        background: #ecfdf5;
        color: #166534;
      }

      .unpaid-badge {
        background: #fffbeb;
        color: #92400e;
      }

      .panels {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .panel {
        border: 1.2px solid #d1d5db;
        padding: 10px 12px 12px;
        background: #fff;
      }

      .panel-title {
        font-size: 12px;
        font-weight: 700;
        color: #166534;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1.5px solid #bbf7d0;
      }

      .panel-row {
        display: grid;
        grid-template-columns: 88px 1fr;
        gap: 8px;
        min-height: 20px;
        align-items: start;
        margin-bottom: 4px;
        font-size: 12px;
        font-weight: 600;
      }

      .label {
        color: #6b7280;
        font-weight: 600;
      }

      .weights {
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border: 1.4px solid #374151;
      }

      .weight-cell {
        padding: 10px 8px 12px;
        text-align: center;
        border-right: 1px solid #d1d5db;
        background: #fff;
      }

      .weight-cell:last-child {
        border-right: none;
      }

      .weight-cell.highlight {
        background: #ecfdf5;
      }

      .weight-label {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
      }

      .weight-value {
        margin-top: 6px;
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        font-variant-numeric: tabular-nums;
      }

      .weight-cell.highlight .weight-value {
        color: #166534;
      }

      .weight-unit {
        margin-top: 2px;
        font-size: 10px;
        font-weight: 600;
        color: #9ca3af;
      }

      .section-label {
        margin-top: 16px;
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #166534;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 12px;
        border: 1.4px solid #374151;
      }

      .items-table th {
        border: none;
        border-right: 1px solid #d1d5db;
        border-bottom: 1.4px solid #374151;
        padding: 9px 8px;
        text-align: center;
        font-weight: 700;
        background: #ecfdf5;
        color: #14532d;
        vertical-align: middle;
      }

      .items-table th:last-child { border-right: none; }

      .items-table td {
        border: none;
        border-right: 1px solid #e5e7eb;
        padding: 9px 8px;
        vertical-align: middle;
        word-break: break-word;
      }

      .items-table td:last-child { border-right: none; }

      .items-table tbody tr.data-row td {
        border-bottom: 1px solid #f3f4f6;
      }

      .items-table tbody tr.data-row:nth-child(even) td {
        background: #fafafa;
      }

      .items-table tbody tr.deduction-row td {
        background: #fffbeb;
        border-bottom: 1px solid #fde68a;
      }

      .col-no { color: #6b7280; font-weight: 600; }
      .col-code { font-size: 11px; font-weight: 600; color: #374151; }
      .col-name .name { font-weight: 600; color: #111827; }
      .col-amount { font-weight: 700; font-variant-numeric: tabular-nums; }

      .deduction-badge {
        display: inline-block;
        padding: 1px 8px;
        background: #fef3c7;
        border: 1px solid #f59e0b;
        color: #92400e;
        font-size: 10px;
        font-weight: 700;
      }

      .sub-note {
        margin-top: 2px;
        font-size: 10px;
        font-weight: 500;
        color: #6b7280;
      }

      .empty-hint {
        text-align: center;
        color: #9ca3af;
        font-weight: 600;
      }

      .items-table tbody tr.spacer-row td {
        height: 88px;
        padding: 0;
        border-bottom: none;
        border-right: 1px solid #e5e7eb;
        background: #fff;
      }

      .items-table tbody tr.spacer-row td:last-child { border-right: none; }

      .items-table tbody tr.totals-row td {
        padding: 8px 10px;
        font-weight: 600;
        vertical-align: middle;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        border-right: 1px solid #e5e7eb;
        border-bottom: none;
      }

      .items-table tbody tr.totals-row td:last-child { border-right: none; }

      .items-table tbody tr.totals-final td {
        background: #ecfdf5;
        border-top: 1.4px solid #374151;
        padding-top: 10px;
        padding-bottom: 10px;
      }

      .totals-label { font-weight: 700; color: #374151; }
      .deduction-amount { color: #b45309; }
      .total-amount { font-size: 15px; font-weight: 700; color: #166534; }

      .text-center { text-align: center; }
      .text-right { text-align: right; }

      .remark-box {
        border-left: 1.4px solid #374151;
        border-right: 1.4px solid #374151;
        border-bottom: 1.4px solid #374151;
        padding: 10px 12px;
        background: #f9fafb;
      }

      .remark-label {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        margin-bottom: 4px;
      }

      .remark-text {
        font-size: 12px;
        font-weight: 600;
        color: #111827;
      }

      .signature-box {
        border-left: 1.4px solid #374151;
        border-right: 1.4px solid #374151;
        border-bottom: 1.4px solid #374151;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        min-height: 96px;
      }

      .signature {
        padding: 14px 16px 12px;
        text-align: center;
        border-right: 1.4px solid #374151;
      }

      .signature:last-child { border-right: none; }

      .sig-title {
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 34px;
      }

      .sig-line {
        border-bottom: 1px dashed #6b7280;
        margin: 0 8px 8px;
      }

      .date {
        font-size: 11px;
        color: #4b5563;
        font-weight: 600;
      }

      .footer-note {
        margin-top: 10px;
        text-align: center;
        font-size: 10px;
        color: #9ca3af;
      }
    </style>
  `;
}

function createPdfHtml(data: WeighbridgeTicketPdfData) {
  const itemRows =
    data.items.length > 0
      ? data.items
          .map(
            (item, index) => `
        <tr class="data-row">
          <td class="text-center col-no">${index + 1}</td>
          <td class="text-center col-code">${escapeHtml(item.code)}</td>
          <td class="col-name">
            <div class="name">${escapeHtml(item.name)}</div>
            ${
              item.description
                ? `<div class="sub-note">${escapeHtml(item.description)}</div>`
                : ""
            }
          </td>
          <td class="text-right">${item.weightKg}</td>
          <td class="text-right">${item.pricePerKg}</td>
          <td class="text-right col-amount">${item.amount}</td>
        </tr>`,
          )
          .join("")
      : `<tr class="data-row"><td colspan="6" class="empty-hint">ยังไม่มีรายการคัดแยก</td></tr>`;

  const deductionRows = data.deductions
    .map(
      (row, index) => `
        <tr class="data-row deduction-row">
          <td class="text-center col-no">${data.items.length + index + 1}</td>
          <td class="text-center col-code">
            <span class="deduction-badge">หัก</span>
          </td>
          <td class="col-name">
            <div class="name">${escapeHtml(row.typeLabel)}</div>
            ${
              row.description
                ? `<div class="sub-note">${escapeHtml(row.description)}</div>`
                : ""
            }
          </td>
          <td class="text-right">${row.weightKg}</td>
          <td class="text-center">-</td>
          <td class="text-right col-amount deduction-amount">-${row.amount}</td>
        </tr>`,
    )
    .join("");

  return `
    <div id="weighbridge-ticket-pdf" class="pdf-page">
      <div class="header">
        <div class="logo-box">
          <img src="${LOGO_URL}" class="logo" />
        </div>
        <div class="company">
          <div class="company-name">บริษัท เอสเอ็มที เอนเนอร์ยี่ จำกัด</div>
          <div class="company-address">
            85 ถนนโยธา แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100
          </div>
          <div class="company-address">
            เบอร์ออฟฟิศ : 02-2359565-8 · เลขประจำตัวผู้เสียภาษี 0 1055 63023 12 4
          </div>
        </div>
      </div>

      <div class="header-rule">
        <span class="rule-green"></span>
        <span class="rule-gold"></span>
        <span class="rule-green"></span>
      </div>

      <div class="title-block">
        <div class="title">ตั๋วชั่ง</div>
        <div class="title-sub">Weighbridge Ticket · ${escapeHtml(data.ticketType)}</div>
      </div>

      <div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">เลขที่ตั๋ว</span>
          <span class="meta-value">${escapeHtml(data.ticketNo)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">ใบรับซื้อ</span>
          <span class="meta-value">${escapeHtml(data.receiptNo)}</span>
        </div>
        <div class="${data.isPaid ? "paid-badge" : "unpaid-badge"}">
          ${data.isPaid ? "จ่ายแล้ว" : "รอจ่าย"}
        </div>
      </div>

      <div class="panels">
        <div class="panel">
          <div class="panel-title">ผู้ขาย / รถ</div>
          <div class="panel-row">
            <span class="label">ชื่อผู้ขาย</span>
            <span>${escapeHtml(data.sellerName)}</span>
          </div>
          <div class="panel-row">
            <span class="label">รหัสผู้ขาย</span>
            <span>${escapeHtml(data.sellerCode)}</span>
          </div>
          <div class="panel-row">
            <span class="label">ทะเบียนรถ</span>
            <span>${escapeHtml(data.licensePlate)}</span>
          </div>
          <div class="panel-row">
            <span class="label">คนขับ</span>
            <span>${escapeHtml(data.driverName)}</span>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">เวลาชั่ง / เครื่องชั่ง</div>
          <div class="panel-row">
            <span class="label">เครื่องชั่ง</span>
            <span>${escapeHtml(data.scaleName)}</span>
          </div>
          <div class="panel-row">
            <span class="label">วันที่เข้า</span>
            <span>${escapeHtml(data.weighInDate)} ${escapeHtml(data.weighInTime)}</span>
          </div>
          <div class="panel-row">
            <span class="label">วันที่ออก</span>
            <span>${escapeHtml(data.weighOutDate)} ${escapeHtml(data.weighOutTime)}</span>
          </div>
          <div class="panel-row">
            <span class="label">ราคาเฉลี่ย</span>
            <span>${data.avgPricePerKg} บ./กก.</span>
          </div>
        </div>
      </div>

      <div class="weights">
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักเข้า</div>
          <div class="weight-value">${data.grossWeightKg}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักออก</div>
          <div class="weight-value">${data.tareWeightKg}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักหัก</div>
          <div class="weight-value">${data.deductionWeightKg}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell highlight">
          <div class="weight-label">น้ำหนักจ่ายจริง</div>
          <div class="weight-value">${data.payableWeightKg}</div>
          <div class="weight-unit">สุทธิชั่ง ${data.netWeightKg} กก.</div>
        </div>
      </div>

      <div class="section-label">รายการสินค้า / ประเภทที่รับซื้อ</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:52px">ลำดับ</th>
            <th style="width:110px">รหัส</th>
            <th>รายการ</th>
            <th style="width:92px">น้ำหนัก (กก.)</th>
            <th style="width:92px">ราคา/กก.</th>
            <th style="width:110px">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${deductionRows}
          <tr class="spacer-row">
            <td></td><td></td><td></td><td></td><td></td><td></td>
          </tr>
          <tr class="totals-row">
            <td colspan="5" class="text-right totals-label">ยอดก่อนหัก</td>
            <td class="text-right">${data.subtotalAmount}</td>
          </tr>
          <tr class="totals-row">
            <td colspan="5" class="text-right totals-label">ยอดหัก</td>
            <td class="text-right deduction-amount">${data.deductionAmount}</td>
          </tr>
          <tr class="totals-row totals-final">
            <td colspan="5" class="text-right totals-label">ยอดสุทธิที่ต้องจ่าย</td>
            <td class="text-right total-amount">${data.totalAmount}</td>
          </tr>
        </tbody>
      </table>

      ${
        data.remark
          ? `<div class="remark-box">
              <div class="remark-label">หมายเหตุ</div>
              <div class="remark-text">${escapeHtml(data.remark)}</div>
            </div>`
          : ""
      }

      <div class="signature-box">
        <div class="signature">
          <div class="sig-title">ผู้ชั่ง</div>
          <div class="sig-line"></div>
          <div class="date">วันที่ _____/_____/_____</div>
        </div>
        <div class="signature">
          <div class="sig-title">ผู้ตรวจ</div>
          <div class="sig-line"></div>
          <div class="date">วันที่ _____/_____/_____</div>
        </div>
        <div class="signature">
          <div class="sig-title">ผู้ขาย</div>
          <div class="sig-line"></div>
          <div class="date">วันที่ _____/_____/_____</div>
        </div>
      </div>

      <div class="footer-note">เอกสารนี้ออกโดยระบบ ERP · SMT Energy</div>
    </div>
  `;
}

export async function generateWeighbridgeTicketPdf(
  data: WeighbridgeTicketPdfData,
) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#fff";
  wrapper.innerHTML = `${createStyle()}${createPdfHtml(data)}`;
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector(
    "#weighbridge-ticket-pdf",
  ) as HTMLElement;
  const logo = wrapper.querySelector(".logo") as HTMLImageElement | null;
  if (logo && !logo.complete) {
    await new Promise<void>((resolve) => {
      logo.onload = () => resolve();
      logo.onerror = () => resolve();
    });
  }

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
  window.open(pdf.output("bloburl"), "_blank");
  document.body.removeChild(wrapper);
}
