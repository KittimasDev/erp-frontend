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
    minimumFractionDigits: 0,
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
    time: date.toLocaleTimeString("th-TH", { hour12: false }),
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
      .pdf-page {
        width: 794px;
        min-height: 1123px;
        box-sizing: border-box;
        padding: 28px 32px 36px;
        background: #fff;
        color: #111;
        font-family: "Sarabun", "Noto Sans Thai", Tahoma, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        position: relative;
      }
      .header {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        border-bottom: 2px solid #374151;
        padding-bottom: 12px;
      }
      .logo { width: 64px; height: auto; display: block; }
      .company { flex: 1; }
      .company-name { font-size: 18px; font-weight: 700; }
      .company-sub { margin-top: 3px; font-size: 12px; color: #374151; }
      .doc-title {
        margin: 14px 0 4px;
        text-align: center;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.08em;
      }
      .doc-sub {
        text-align: center;
        font-size: 12px;
        color: #4b5563;
        margin-bottom: 14px;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 18px;
        border: 1.5px solid #374151;
        padding: 12px 14px;
      }
      .row {
        display: grid;
        grid-template-columns: 118px 1fr;
        gap: 8px;
        align-items: baseline;
      }
      .label { font-weight: 700; color: #374151; white-space: nowrap; }
      .value { font-weight: 600; word-break: break-word; }
      .weights {
        margin-top: 12px;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border: 1.5px solid #374151;
      }
      .weight-cell {
        padding: 10px 8px;
        text-align: center;
        border-right: 1px solid #9ca3af;
      }
      .weight-cell:last-child { border-right: none; }
      .weight-label { font-size: 11px; font-weight: 700; color: #4b5563; }
      .weight-value { margin-top: 4px; font-size: 18px; font-weight: 700; }
      .weight-unit { font-size: 11px; font-weight: 600; color: #6b7280; }
      .section-title {
        margin: 16px 0 6px;
        font-size: 13px;
        font-weight: 700;
        color: #14532d;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        border: 1.4px solid #374151;
        font-size: 12px;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 7px 8px;
        vertical-align: middle;
      }
      th {
        background: #ecfdf5;
        color: #14532d;
        font-weight: 700;
        text-align: center;
      }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .totals {
        margin-top: 12px;
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 12px;
      }
      .remark-box {
        border: 1.4px solid #374151;
        padding: 10px 12px;
        min-height: 88px;
      }
      .remark-label { font-weight: 700; margin-bottom: 6px; }
      .summary {
        border: 1.4px solid #374151;
        border-collapse: collapse;
        width: 100%;
      }
      .summary td {
        border: 1px solid #d1d5db;
        padding: 8px 10px;
      }
      .summary td:first-child {
        background: #f9fafb;
        font-weight: 700;
        width: 55%;
      }
      .summary tr.net td {
        font-weight: 700;
        font-size: 14px;
        background: #f0fdf4;
      }
      .paid-stamp {
        position: absolute;
        right: 48px;
        top: 120px;
        border: 3px solid #dc2626;
        color: #dc2626;
        font-size: 28px;
        font-weight: 800;
        padding: 8px 18px;
        transform: rotate(-18deg);
        opacity: 0.85;
        letter-spacing: 0.12em;
      }
      .footer {
        margin-top: 28px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        border: 1.4px solid #374151;
        min-height: 100px;
      }
      .sig {
        text-align: center;
        padding: 14px 10px;
        border-right: 1px solid #374151;
      }
      .sig:last-child { border-right: none; }
      .sig-line {
        margin: 36px 16px 8px;
        border-bottom: 1px dashed #6b7280;
      }
      .sig-role { font-size: 12px; font-weight: 700; }
    </style>
  `;
}

function createPdfHtml(data: WeighbridgeTicketPdfData) {
  const itemRows =
    data.items.length > 0
      ? data.items
          .map(
            (item, index) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${escapeHtml(item.code)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td class="text-right">${item.weightKg}</td>
          <td class="text-right">${item.pricePerKg}</td>
          <td class="text-right">${item.amount}</td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="6" class="text-center">ยังไม่มีรายการคัดแยก</td></tr>`;

  const deductionRows =
    data.deductions.length > 0
      ? data.deductions
          .map(
            (row, index) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${escapeHtml(row.typeLabel)}</td>
          <td>${escapeHtml(row.description || "-")}</td>
          <td class="text-right">${row.weightKg}</td>
          <td class="text-right">${row.amount}</td>
        </tr>`,
          )
          .join("")
      : "";

  return `
    <div id="weighbridge-ticket-pdf" class="pdf-page">
      ${data.isPaid ? `<div class="paid-stamp">จ่ายแล้ว</div>` : ""}
      <div class="header">
        <img src="${LOGO_URL}" class="logo" />
        <div class="company">
          <div class="company-name">บริษัท เอสเอ็มที เอนเนอร์ยี่ จำกัด</div>
          <div class="company-sub">
            85 ถนนโยธา แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100
          </div>
          <div class="company-sub">เบอร์ติดต่อ : 02-2359565-8</div>
        </div>
      </div>

      <div class="doc-title">ตั๋วชั่ง</div>
      <div class="doc-sub">ใบชั่งน้ำหนักรับซื้อ · ${escapeHtml(data.receiptNo !== "-" ? `อ้างอิง ${data.receiptNo}` : "ยังไม่ผูกใบรับซื้อ")}</div>

      <div class="meta-grid">
        <div class="row"><span class="label">หมายเลขบัตร</span><span class="value">${escapeHtml(data.ticketNo)}</span></div>
        <div class="row"><span class="label">บัตรชั่งแบบ</span><span class="value">${escapeHtml(data.ticketType)}</span></div>
        <div class="row"><span class="label">การค้า</span><span class="value">${escapeHtml(data.tradeType)}</span></div>
        <div class="row"><span class="label">เครื่องชั่ง</span><span class="value">${escapeHtml(data.scaleName)}</span></div>
        <div class="row"><span class="label">ทะเบียนรถ</span><span class="value">${escapeHtml(data.licensePlate)}</span></div>
        <div class="row"><span class="label">รหัสลูกค้า</span><span class="value">${escapeHtml(data.sellerCode)}</span></div>
        <div class="row"><span class="label">ชื่อลูกค้า</span><span class="value">${escapeHtml(data.sellerName)}</span></div>
        <div class="row"><span class="label">วันที่เข้า</span><span class="value">${escapeHtml(data.weighInDate)} ${escapeHtml(data.weighInTime)}</span></div>
        <div class="row"><span class="label">วันที่ออก</span><span class="value">${escapeHtml(data.weighOutDate)} ${escapeHtml(data.weighOutTime)}</span></div>
        <div class="row"><span class="label">ราคา/หน่วย</span><span class="value">${data.avgPricePerKg} บ./กก.</span></div>
      </div>

      <div class="weights">
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักรวม</div>
          <div class="weight-value">${data.grossWeightKg}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักรถ</div>
          <div class="weight-value">${data.tareWeightKg}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักหัก</div>
          <div class="weight-value">${data.deductionWeightKg}</div>
          <div class="weight-unit">กก.</div>
        </div>
        <div class="weight-cell">
          <div class="weight-label">น้ำหนักสุทธิ</div>
          <div class="weight-value">${data.payableWeightKg}</div>
          <div class="weight-unit">กก. จ่ายจริง</div>
        </div>
      </div>

      <div class="section-title">รายการสินค้า / ประเภทที่รับซื้อ</div>
      <table>
        <thead>
          <tr>
            <th style="width:44px">ลำดับ</th>
            <th style="width:88px">รหัส</th>
            <th>ชื่อสินค้า</th>
            <th style="width:88px">น้ำหนัก</th>
            <th style="width:88px">ราคา/กก.</th>
            <th style="width:100px">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      ${
        deductionRows
          ? `
      <div class="section-title">รายการหัก</div>
      <table>
        <thead>
          <tr>
            <th style="width:44px">ลำดับ</th>
            <th style="width:140px">ประเภทหัก</th>
            <th>รายละเอียด</th>
            <th style="width:88px">น้ำหนักหัก</th>
            <th style="width:100px">จำนวนเงินหัก</th>
          </tr>
        </thead>
        <tbody>${deductionRows}</tbody>
      </table>`
          : ""
      }

      <div class="totals">
        <div class="remark-box">
          <div class="remark-label">หมายเหตุ</div>
          <div>${escapeHtml(data.remark || " ")}</div>
          <div style="margin-top:10px;font-size:12px;color:#4b5563">
            น้ำหนักชั่งสุทธิ ${data.netWeightKg} กก. · น้ำหนักหลังหัก ${data.payableWeightKg} กก.
          </div>
        </div>
        <table class="summary">
          <tr><td>รวมเป็นเงิน</td><td class="text-right">${data.subtotalAmount}</td></tr>
          <tr><td>หัก</td><td class="text-right">${data.deductionAmount}</td></tr>
          <tr class="net"><td>รวมเป็นเงิน</td><td class="text-right">${data.totalAmount} บ.</td></tr>
        </table>
      </div>

      <div class="footer">
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-role">ผู้ชั่ง</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-role">ผู้ตรวจ</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-role">ผู้ขาย</div>
        </div>
      </div>
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

  const target = wrapper.querySelector("#weighbridge-ticket-pdf") as HTMLElement;
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
