import {
  companyBrandName,
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
} from "./pdf-common";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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


function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function createPdfHtml(data: RawTirePaymentVoucherPdfData) {
  return `
    <div id="raw-tire-payment-voucher-pdf" class="pdf-page">
      <div class="header">
        <div class="logo-box">
          <img src="${companyLogoUrl()}" class="logo" />
        </div>
        <div class="company">${companyIdentityLinesHtml({
          taxIdStyle: "grouped",
        })}
        </div>
      </div>

      <div class="header-rule"></div>

      <div class="title-block">
        <div class="title">ใบสำคัญจ่าย</div>
        <div class="title-sub">Payment Voucher</div>
      </div>

      <div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">เลขที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(data.voucherNo)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">วันที่จ่าย</span>
          <span class="meta-value">${escapeHtml(data.voucherDate)}</span>
        </div>
      </div>

      <div class="panels">
        <div class="panel">
          <div class="panel-title">ผู้รับเงิน</div>
          <div class="panel-row">
            <span class="label">ชื่อผู้ขาย</span>
            <span>${escapeHtml(data.sellerName)}</span>
          </div>
          <div class="panel-row">
            <span class="label">รหัสผู้ขาย</span>
            <span>${escapeHtml(data.sellerCode)}</span>
          </div>
          <div class="panel-row">
            <span class="label">ใบรับซื้อ</span>
            <span>${escapeHtml(data.receiptNo)}</span>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">รายละเอียดการจ่าย</div>
          <div class="panel-row">
            <span class="label">วิธีจ่าย</span>
            <span>${escapeHtml(data.paymentMethod)}</span>
          </div>
          <div class="panel-row">
            <span class="label">เลขอ้างอิง</span>
            <span>${escapeHtml(data.transactionRef)}</span>
          </div>
          <div class="panel-row">
            <span class="label">บัญชีรับโอน</span>
            <span>${escapeHtml(data.bankInfo)}</span>
          </div>
        </div>
      </div>

      <div class="amount-hero">
        <div class="amount-label">จำนวนเงินที่จ่าย</div>
        <div class="amount-value">${data.amount} <span>บาท</span></div>
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
            <th style="width: 56px;">ลำดับ</th>
            <th style="width: 90px;">รหัส</th>
            <th>รายการ</th>
            <th style="width: 90px;">หน่วย</th>
            <th style="width: 120px;">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          <tr class="data-row">
            <td class="text-center col-no">1</td>
            <td class="text-center col-code">PAY</td>
            <td class="col-name">
              <div class="name">จ่ายค่าซื้อยางตามใบรับซื้อ ${escapeHtml(data.receiptNo)}</div>
            </td>
            <td class="text-center">บาท</td>
            <td class="text-right col-amount">${data.amount}</td>
          </tr>
          <tr class="spacer-row">
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
          <tr class="totals-row totals-final">
            <td colspan="4" class="text-right totals-label">ยอดจ่ายสุทธิ</td>
            <td class="text-right total-amount">${data.amount}</td>
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

      <div class="footer-note">เอกสารนี้ออกโดยระบบ ERP · ${escapeHtml(companyBrandName())}</div>
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
        font-weight: 500;
        color: #111827;
        margin-bottom: 6px;
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
        font-weight: 500;
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
        font-weight: 500;
      }

      .meta-value {
        font-size: 13px;
        font-weight: 500;
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
      }

      .panel-title {
        font-size: 12px;
        font-weight: 500;
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
        margin-bottom: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .label {
        color: #6b7280;
        font-weight: 500;
      }

      .amount-hero {
        margin-top: 14px;
        border: 1.5px solid #86efac;
        background: #f0fdf4;
        padding: 16px 18px;
        text-align: center;
      }

      .amount-label {
        font-size: 12px;
        font-weight: 500;
        color: #166534;
        margin-bottom: 6px;
      }

      .amount-value {
        font-size: 28px;
        font-weight: 500;
        color: #14532d;
      }

      .amount-value span {
        font-size: 14px;
        font-weight: 500;
      }

      .amount-remark {
        margin-top: 8px;
        font-size: 11px;
        color: #4b5563;
      }

      .section-label {
        margin-top: 14px;
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 500;
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
        font-weight: 500;
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
      }

      .items-table td:last-child { border-right: none; }

      .items-table tbody tr.data-row td {
        border-bottom: 1px solid #f3f4f6;
      }

      .col-no { color: #6b7280; font-weight: 500; }
      .col-code { font-size: 11px; font-weight: 500; color: #374151; }
      .col-name .name { font-weight: 500; color: #111827; }
      .col-amount { font-weight: 500; }

      .items-table tbody tr.spacer-row td {
        height: 180px;
        padding: 0;
        border-bottom: none;
        border-right: 1px solid #e5e7eb;
        background: #fff;
      }

      .items-table tbody tr.spacer-row td:last-child { border-right: none; }

      .items-table tbody tr.totals-row td {
        padding: 10px;
        font-weight: 500;
        background: #ecfdf5;
        border-top: 1.4px solid #86efac;
        border-right: 1px solid #e5e7eb;
      }

      .items-table tbody tr.totals-row td:last-child { border-right: none; }

      .totals-label { font-weight: 500; color: #374151; }
      .total-amount { font-size: 15px; font-weight: 500; color: #166534; }

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

      .signature:last-child { border-right: none; }

      .sig-title {
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 28px;
      }

      .sig-line {
        border-bottom: 1px dashed #6b7280;
        margin: 0 8px 8px;
      }

      .date {
        font-size: 11px;
        color: #4b5563;
        font-weight: 500;
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

export async function generateRawTirePaymentVoucherPdf(
  data: RawTirePaymentVoucherPdfData,
) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

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

  const target = wrapper.querySelector(
    "#raw-tire-payment-voucher-pdf",
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
