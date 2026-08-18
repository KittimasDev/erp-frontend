import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

const LOGO_URL = "/9315db73-509d-48a7-a8a8-deccea44bb93.png";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
      receipt.truck?.licensePlate ||
      receipt.ticket?.truckLicensePlate ||
      "-",
    driverName:
      receipt.truck?.driverName || receipt.ticket?.driverName || "-",
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

function createPdfHtml(data: RawTirePurchaseReceiptPdfData) {
  const itemRows = data.items
    .map(
      (item) => `
        <tr class="data-row">
          <td class="text-center col-no">${item.no}</td>
          <td class="text-center col-code">${escapeHtml(item.classificationCode)}</td>
          <td class="col-name">
            <div class="name">${escapeHtml(item.classificationName)}</div>
            ${
              item.description
                ? `<div class="sub-note">${escapeHtml(item.description)}</div>`
                : ""
            }
          </td>
          <td class="text-right">${item.weightKg}</td>
          <td class="text-right">${item.pricePerKg}</td>
          <td class="text-right col-amount">${item.amount}</td>
        </tr>
      `,
    )
    .join("");

  const deductionRows = data.deductions
    .map(
      (row, index) => `
        <tr class="data-row deduction-row">
          <td class="text-center col-no">${data.items.length + index + 1}</td>
          <td class="text-center col-code">
            <span class="deduction-badge">หัก</span>
          </td>
          <td class="col-name">
            <div class="name">${escapeHtml(row.deductionName)}</div>
          </td>
          <td class="text-right">${row.deductionWeightKg}</td>
          <td class="text-right">${row.deductionPricePerKg}</td>
          <td class="text-right col-amount deduction-amount">-${row.deductionAmount}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div id="raw-tire-receipt-pdf" class="pdf-page">
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

      <div class="header-rule"></div>

      <div class="title-block">
        <div class="title">ใบรับซื้อยาง</div>
        <div class="title-sub">Raw Tire Purchase Receipt</div>
      </div>

      <div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">เลขที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(data.receiptNo)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">วันที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(data.receiptDate)}</span>
        </div>
      </div>

      <div class="panels">
        <div class="panel">
          <div class="panel-title">ข้อมูลผู้ขาย</div>
          <div class="panel-row">
            <span class="label">ชื่อผู้ขาย</span>
            <span>${escapeHtml(data.sellerName)}</span>
          </div>
          <div class="panel-row">
            <span class="label">รหัสผู้ขาย</span>
            <span>${escapeHtml(data.sellerCode)}</span>
          </div>
          <div class="panel-row">
            <span class="label">ผู้ติดต่อ</span>
            <span>${escapeHtml(data.contactName)}</span>
          </div>
          <div class="panel-row">
            <span class="label">เบอร์โทร</span>
            <span>${escapeHtml(data.phone)}</span>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">รถ / น้ำหนัก</div>
          <div class="panel-row">
            <span class="label">ทะเบียนรถ</span>
            <span>${escapeHtml(data.truckLicensePlate)}</span>
          </div>
          <div class="panel-row">
            <span class="label">คนขับ</span>
            <span>${escapeHtml(data.driverName)}</span>
          </div>
          <div class="panel-row">
            <span class="label">น้ำหนักเข้า</span>
            <span>${data.grossWeightKg} กก.</span>
          </div>
          <div class="panel-row">
            <span class="label">น้ำหนักออก</span>
            <span>${data.tareWeightKg} กก.</span>
          </div>
          <div class="net-weight">
            <span>น้ำหนักสุทธิ</span>
            <strong>${data.netWeightKg} กก.</strong>
          </div>
        </div>
      </div>

      <div class="section-label">รายการรับซื้อ</div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 52px;">ลำดับ</th>
            <th style="width: 130px;">รหัส</th>
            <th>รายการ</th>
            <th style="width: 92px;">น้ำหนัก (กก.)</th>
            <th style="width: 92px;">ราคา/กก.</th>
            <th style="width: 110px;">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${deductionRows}
          <tr class="spacer-row">
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
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

      <div class="signature-box">
        <div class="signature">
          <div class="sig-title">ผู้จัดทำ</div>
          <div class="sig-line"></div>
          <div class="date">วันที่ _____/_____/_____</div>
        </div>
        <div class="signature">
          <div class="sig-title">ผู้ตรวจสอบ</div>
          <div class="sig-line"></div>
          <div class="date">วันที่ _____/_____/_____</div>
        </div>
        <div class="signature">
          <div class="sig-title">ผู้รับเงิน</div>
          <div class="sig-line"></div>
          <div class="date">วันที่ _____/_____/_____</div>
        </div>
      </div>

      <div class="footer-note">เอกสารนี้ออกโดยระบบ ERP · SMT Energy</div>
    </div>
  `;
}

function createStyle() {
  return `
    <style>
      * { box-sizing: border-box; }

      body {
        margin: 0;
        font-family: Tahoma, "Noto Sans Thai", Arial, sans-serif;
        color: #1f2937;
        background: #ffffff;
      }

      .pdf-page {
        width: 794px;
        min-height: 1123px;
        padding: 28px 30px 32px;
        background: #ffffff;
        color: #1f2937;
        font-size: 12px;
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
        height: 3px;
        background: linear-gradient(90deg, #7cb82f 0%, #f0b429 55%, #7cb82f 100%);
      }

      .title-block {
        text-align: center;
        margin-top: 18px;
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
        gap: 18px;
      }

      .meta-item {
        display: flex;
        align-items: baseline;
        gap: 8px;
        border: 1.2px solid #d1d5db;
        background: #f9fafb;
        padding: 7px 12px;
        min-width: 210px;
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

      .net-weight {
        margin-top: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f0fdf4;
        border: 1.2px solid #86efac;
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 600;
      }

      .net-weight strong {
        font-size: 15px;
        color: #166534;
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

      .items-table th:last-child {
        border-right: none;
      }

      .items-table td {
        border: none;
        border-right: 1px solid #e5e7eb;
        padding: 9px 8px;
        vertical-align: middle;
        word-break: break-word;
      }

      .items-table td:last-child {
        border-right: none;
      }

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

      .col-no {
        color: #6b7280;
        font-weight: 600;
      }

      .col-code {
        font-size: 11px;
        font-weight: 600;
        color: #374151;
      }

      .col-name .name {
        font-weight: 600;
        color: #111827;
      }

      .col-amount {
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }

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

      .items-table tbody tr.spacer-row td {
        height: 160px;
        padding: 0;
        border-bottom: none;
        border-right: 1px solid #e5e7eb;
        background: #fff;
      }

      .items-table tbody tr.spacer-row td:last-child {
        border-right: none;
      }

      .items-table tbody tr.totals-row td {
        padding: 8px 10px;
        font-weight: 600;
        vertical-align: middle;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        border-right: 1px solid #e5e7eb;
        border-bottom: none;
      }

      .items-table tbody tr.totals-row td:last-child {
        border-right: none;
      }

      .items-table tbody tr.totals-final td {
        background: #ecfdf5;
        border-top: 1.4px solid #86efac;
        padding-top: 10px;
        padding-bottom: 10px;
      }

      .totals-label {
        font-weight: 700;
        color: #374151;
      }

      .deduction-amount {
        color: #b45309;
      }

      .total-amount {
        font-size: 15px;
        font-weight: 700;
        color: #166534;
      }

      .text-center { text-align: center; }
      .text-right { text-align: right; }

      .signature-box {
        border-left: 1.3px solid #374151;
        border-right: 1.3px solid #374151;
        border-bottom: 1.3px solid #374151;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        min-height: 96px;
      }

      .signature {
        padding: 14px 16px 12px;
        text-align: center;
        border-right: 1.3px solid #374151;
      }

      .signature:last-child {
        border-right: none;
      }

      .sig-title {
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 28px;
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

export async function generateRawTirePurchaseReceiptPdf(
  data: RawTirePurchaseReceiptPdfData,
) {
  const wrapper = document.createElement("div");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#fff";

  wrapper.innerHTML = `
    ${createStyle()}
    ${createPdfHtml(data)}
  `;

  document.body.appendChild(wrapper);

  const target = wrapper.querySelector("#raw-tire-receipt-pdf") as HTMLElement;
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
