import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import type { SupplierPaymentVoucher } from "@/types/purchase-payments";
import {
  SUPPLIER_PAYMENT_METHOD_LABEL,
  SUPPLIER_PAYMENT_STATUS_LABEL,
} from "@/types/purchase-payments";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

export type SupplierPaymentVoucherPdfData = {
  voucherNo: string;
  voucherDate: string;
  statusLabel: string;
  poNo: string;
  creditorCode: string;
  creditorName: string;
  paymentMethod: string;
  paymentTerm: string;
  totalAmount: string;
  totalAmountRaw: number;
  remark: string;
  paidBy: string;
  payments: Array<{
    no: number;
    paymentDate: string;
    method: string;
    transactionRef: string;
    amount: string;
  }>;
};

const LOGO_URL = "/9315db73-509d-48a7-a8a8-deccea44bb93.png";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMoney(value?: string | number) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return String(value ?? "0.00");
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("th-TH");
}

export function mapSupplierPaymentVoucherToPdfData(
  voucher: SupplierPaymentVoucher,
): SupplierPaymentVoucherPdfData {
  const payments = (voucher.payments ?? []).map((payment, index) => ({
    no: index + 1,
    paymentDate: formatDate(payment.paymentDate),
    method:
      SUPPLIER_PAYMENT_METHOD_LABEL[payment.paymentMethod ?? ""] ??
      payment.paymentMethod ??
      SUPPLIER_PAYMENT_METHOD_LABEL[voucher.paymentMethod] ??
      voucher.paymentMethod,
    transactionRef: payment.transactionRef || "-",
    amount: formatMoney(payment.amount),
  }));

  return {
    voucherNo: voucher.voucherNo,
    voucherDate: formatDate(voucher.voucherDate),
    statusLabel:
      SUPPLIER_PAYMENT_STATUS_LABEL[voucher.status] ?? voucher.status,
    poNo: voucher.purchaseOrder?.poNo || "-",
    creditorCode: voucher.creditor?.creditorCode || "-",
    creditorName: voucher.creditor?.nameTh || "-",
    paymentMethod:
      SUPPLIER_PAYMENT_METHOD_LABEL[voucher.paymentMethod] ??
      voucher.paymentMethod,
    paymentTerm: voucher.paymentTerm?.name || "ไม่ระบุ",
    totalAmount: formatMoney(voucher.totalAmount),
    totalAmountRaw: Number(voucher.totalAmount) || 0,
    remark: voucher.remark?.trim() || "",
    paidBy: voucher.paidBy?.displayName || "",
    payments,
  };
}

function createStyle() {
  return `
    <style>
      * { box-sizing: border-box; }
      .pdf-page {
        width: 794px;
        min-height: 1123px;
        padding: 28px 32px 36px;
        background: #fff;
        color: #1f2937;
        font-family: "Sarabun", "Noto Sans Thai", Tahoma, sans-serif;
        font-size: 13px;
        line-height: 1.45;
      }
      .header {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }
      .logo { width: 64px; height: auto; display: block; }
      .company { flex: 1; }
      .company-name { font-size: 18px; font-weight: 700; }
      .company-address { margin-top: 3px; font-size: 12px; color: #374151; }
      .header-rule {
        margin: 12px 0 14px;
        border-bottom: 2px solid #374151;
      }
      .title-block { text-align: center; margin-bottom: 14px; }
      .title { font-size: 24px; font-weight: 700; letter-spacing: 0.06em; }
      .title-sub { margin-top: 2px; font-size: 12px; color: #6b7280; }
      .meta-bar {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        border: 1.4px solid #374151;
        padding: 10px 12px;
        margin-bottom: 12px;
      }
      .meta-label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
      }
      .meta-value { font-size: 14px; font-weight: 700; }
      .panels {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }
      .panel {
        border: 1.4px solid #374151;
        padding: 10px 12px;
        min-height: 120px;
      }
      .panel-title {
        font-weight: 700;
        color: #14532d;
        margin-bottom: 8px;
      }
      .panel-row {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: 8px;
        margin-bottom: 4px;
        font-weight: 600;
      }
      .label { color: #6b7280; }
      .amount-hero {
        border: 1.5px solid #86efac;
        background: #f0fdf4;
        padding: 16px 18px;
        text-align: center;
        margin-bottom: 14px;
      }
      .amount-label {
        font-size: 12px;
        font-weight: 700;
        color: #166534;
        margin-bottom: 6px;
      }
      .amount-value {
        font-size: 28px;
        font-weight: 700;
        color: #14532d;
      }
      .amount-value span { font-size: 14px; font-weight: 600; }
      .amount-baht {
        margin-top: 8px;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
      }
      .amount-remark {
        margin-top: 8px;
        font-size: 11px;
        color: #4b5563;
      }
      .section-label {
        margin: 0 0 6px;
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
      .items-table th,
      .items-table td {
        border: 1px solid #d1d5db;
        padding: 8px;
        vertical-align: middle;
      }
      .items-table th {
        background: #ecfdf5;
        color: #14532d;
        font-weight: 700;
        text-align: center;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .col-amount { font-weight: 700; }
      .signature-box {
        margin-top: 28px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        border: 1.4px solid #374151;
        min-height: 110px;
      }
      .signature {
        text-align: center;
        padding: 14px 12px 12px;
        border-right: 1px solid #374151;
      }
      .signature:last-child { border-right: none; }
      .sig-title { font-size: 12px; font-weight: 700; margin-bottom: 34px; }
      .sig-line {
        border-bottom: 1px dashed #6b7280;
        margin: 0 10px 8px;
      }
      .date { font-size: 11px; color: #4b5563; font-weight: 600; }
      .footer-note {
        margin-top: 12px;
        text-align: center;
        font-size: 10px;
        color: #9ca3af;
      }
    </style>
  `;
}

function createPdfHtml(data: SupplierPaymentVoucherPdfData) {
  const bahtText = numberToThaiBahtText(data.totalAmountRaw);
  const paymentRows =
    data.payments.length > 0
      ? data.payments
          .map(
            (row) => `
        <tr>
          <td class="text-center">${row.no}</td>
          <td class="text-center">${escapeHtml(row.paymentDate)}</td>
          <td>${escapeHtml(row.method)}</td>
          <td>${escapeHtml(row.transactionRef)}</td>
          <td class="text-right col-amount">${row.amount}</td>
        </tr>`,
          )
          .join("")
      : `
        <tr>
          <td class="text-center">1</td>
          <td class="text-center">${escapeHtml(data.voucherDate)}</td>
          <td>${escapeHtml(data.paymentMethod)}</td>
          <td>จ่ายตามใบสั่งซื้อ ${escapeHtml(data.poNo)}</td>
          <td class="text-right col-amount">${data.totalAmount}</td>
        </tr>`;

  return `
    <div id="supplier-payment-voucher-pdf" class="pdf-page">
      <div class="header">
        <img src="${LOGO_URL}" class="logo" />
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
        <div class="title">ใบสำคัญจ่าย</div>
        <div class="title-sub">Supplier Payment Voucher</div>
      </div>

      <div class="meta-bar">
        <div>
          <span class="meta-label">เลขที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(data.voucherNo)}</span>
        </div>
        <div>
          <span class="meta-label">วันที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(data.voucherDate)}</span>
        </div>
        <div>
          <span class="meta-label">สถานะ</span>
          <span class="meta-value">${escapeHtml(data.statusLabel)}</span>
        </div>
      </div>

      <div class="panels">
        <div class="panel">
          <div class="panel-title">ผู้รับเงิน</div>
          <div class="panel-row"><span class="label">รหัสผู้ขาย</span><span>${escapeHtml(data.creditorCode)}</span></div>
          <div class="panel-row"><span class="label">ชื่อผู้ขาย</span><span>${escapeHtml(data.creditorName)}</span></div>
          <div class="panel-row"><span class="label">อ้างอิง PO</span><span>${escapeHtml(data.poNo)}</span></div>
        </div>
        <div class="panel">
          <div class="panel-title">รายละเอียดการจ่าย</div>
          <div class="panel-row"><span class="label">วิธีจ่าย</span><span>${escapeHtml(data.paymentMethod)}</span></div>
          <div class="panel-row"><span class="label">เงื่อนไข</span><span>${escapeHtml(data.paymentTerm)}</span></div>
          <div class="panel-row"><span class="label">ผู้จ่าย</span><span>${escapeHtml(data.paidBy || "-")}</span></div>
        </div>
      </div>

      <div class="amount-hero">
        <div class="amount-label">จำนวนเงินที่จ่าย</div>
        <div class="amount-value">${data.totalAmount} <span>บาท</span></div>
        <div class="amount-baht">( ${escapeHtml(bahtText)} )</div>
        ${
          data.remark
            ? `<div class="amount-remark">หมายเหตุ: ${escapeHtml(data.remark)}</div>`
            : ""
        }
      </div>

      <div class="section-label">รายการจ่าย</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:48px">ลำดับ</th>
            <th style="width:100px">วันที่จ่าย</th>
            <th style="width:120px">วิธีจ่าย</th>
            <th>อ้างอิง / รายละเอียด</th>
            <th style="width:120px">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>${paymentRows}</tbody>
      </table>

      <div class="signature-box">
        <div class="signature">
          <div class="sig-title">ผู้จัดทำ</div>
          <div class="sig-line"></div>
          <div class="date">วันที่ _____/_____/_____</div>
        </div>
        <div class="signature">
          <div class="sig-title">ผู้จ่าย</div>
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

export async function generateSupplierPaymentVoucherPdf(
  data: SupplierPaymentVoucherPdfData,
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
    "#supplier-payment-voucher-pdf",
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
