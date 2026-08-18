import {
  companyIdentityLinesHtml,
  companyLogoUrl,
} from "./pdf-common";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

export type GoodsReceiptPdfItem = {
  no: number;
  itemCode: string;
  itemName: string;
  warehouse: string;
  lotNo?: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

export type GoodsReceiptPdfData = {
  grNo: string;
  grDate: string;
  poNo: string;
  deliveryDate: string;
  licensePlate?: string;
  vendorCode: string;
  vendorName: string;
  vendorAddress?: string;
  vendorTaxId?: string;
  vendorPhone?: string;
  remark?: string;
  items: GoodsReceiptPdfItem[];
  subtotalAmount: string;
  discountAmount: string;
  afterDiscountAmount: string;
  vatAmount: string;
  netAmount: string;
  netAmountRaw: number;
  preparedBy?: string;
};


function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createStyle() {
  return `
    <style>
      * { box-sizing: border-box; }

      .pdf-page {
        --ink: #1f2937;
        --muted: #6b7280;
        --line: #d1d5db;
        --line-strong: #9ca3af;
        --soft: #f3f4f6;
        width: 794px;
        padding: 32px 36px 36px;
        background: #fff;
        color: var(--ink);
        font-family: "Sarabun", "Noto Sans Thai", Tahoma, sans-serif;
        font-size: 12.5px;
        line-height: 1.5;
      }

      .header {
        display: grid;
        grid-template-columns: 120px 1fr;
        align-items: center;
        gap: 16px;
        margin-bottom: 10px;
      }
      .logo {
        width: 112px;
        height: auto;
        max-height: 64px;
        object-fit: contain;
        display: block;
      }
      .company { text-align: center; padding-right: 48px; }
      .company-name {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.02em;
        margin-bottom: 4px;
      }
      .company-address {
        font-size: 11.5px;
        color: #4b5563;
        line-height: 1.55;
      }

      .header-rule {
        height: 3px;
        margin: 12px 0 16px;
        background: linear-gradient(90deg, #7cb82f 0%, #f0b429 55%, #7cb82f 100%);
        border-radius: 2px;
      }

      .doc-title {
        text-align: center;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0.08em;
        margin: 0 0 18px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.9fr;
        gap: 12px;
        margin-bottom: 16px;
      }
      .info-card {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 14px 16px;
        background: #fff;
        min-height: 0;
      }
      .info-card-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--soft);
      }
      .info-row {
        display: grid;
        grid-template-columns: 108px 1fr;
        gap: 8px;
        margin-bottom: 7px;
        align-items: start;
      }
      .info-row:last-child { margin-bottom: 0; }
      .info-label {
        font-weight: 600;
        color: #4b5563;
        white-space: nowrap;
      }
      .info-value {
        color: var(--ink);
        word-break: break-word;
      }

      .items-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 14px;
      }
      .items-table th,
      .items-table td {
        border-bottom: 1px solid var(--line);
        border-right: 1px solid var(--line);
        padding: 9px 8px;
        vertical-align: middle;
        font-size: 12px;
      }
      .items-table th:last-child,
      .items-table td:last-child { border-right: none; }
      .items-table tbody tr:last-child td { border-bottom: none; }
      .items-table th {
        background: var(--soft);
        font-weight: 700;
        text-align: center;
        color: #374151;
        font-size: 11.5px;
      }
      .item-code { font-weight: 600; }
      .item-name { margin-top: 2px; }
      .warehouse-line {
        margin-top: 3px;
        color: #6f9720;
        font-size: 11px;
        font-weight: 600;
      }
      .lot-line {
        margin-top: 2px;
        color: #8ab933;
        font-size: 11px;
        font-weight: 600;
      }
      .empty-row td {
        height: 34px;
        color: transparent;
      }

      .text-center { text-align: center; }
      .text-right { text-align: right; font-variant-numeric: tabular-nums; }

      .bottom-grid {
        display: grid;
        grid-template-columns: 1fr 240px;
        gap: 12px;
        margin-bottom: 22px;
        align-items: stretch;
      }
      .remark-card {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        min-height: 148px;
      }
      .remark-label {
        font-weight: 700;
        color: #4b5563;
        margin-bottom: 8px;
        font-size: 12px;
      }
      .remark-body {
        flex: 1;
        white-space: pre-wrap;
        color: var(--ink);
        min-height: 40px;
      }
      .baht-text {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px dashed var(--line);
        text-align: center;
        font-weight: 600;
        font-size: 12.5px;
        color: #111827;
      }

      .summary-card {
        border: 1px solid var(--line);
        border-radius: 8px;
        overflow: hidden;
      }
      .summary-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        padding: 9px 12px;
        border-bottom: 1px solid var(--line);
        font-size: 12px;
      }
      .summary-row:last-child { border-bottom: none; }
      .summary-row span:first-child {
        color: #4b5563;
        font-weight: 600;
      }
      .summary-row strong {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
      }
      .summary-row.net {
        background: var(--soft);
      }
      .summary-row.net span:first-child,
      .summary-row.net strong {
        color: #111827;
        font-weight: 700;
        font-size: 13px;
      }

      .signatures {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .sig {
        border: 1px solid var(--line);
        border-radius: 8px;
        text-align: center;
        padding: 16px 12px 14px;
        min-height: 128px;
      }
      .sig-line {
        width: 78%;
        margin: 0 auto 10px;
        border-bottom: 1px dotted var(--line-strong);
        height: 42px;
      }
      .sig-name {
        min-height: 18px;
        font-size: 11.5px;
        margin-bottom: 4px;
        color: #374151;
      }
      .sig-role {
        font-weight: 700;
        font-size: 12.5px;
      }
      .sig-date {
        margin-top: 12px;
        font-size: 11px;
        color: var(--muted);
      }
    </style>
  `;
}

function createPdfHtml(data: GoodsReceiptPdfData) {
  const fillerCount = Math.max(0, Math.min(3, 4 - data.items.length));
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td class="text-center" style="width:44px;">${item.no}</td>
          <td>
            <div class="item-code">${escapeHtml(item.itemCode)} ${escapeHtml(item.itemName)}</div>
            <div class="warehouse-line">คลัง : ${escapeHtml(item.warehouse)}</div>
            ${
              item.lotNo
                ? `<div class="lot-line">Lot : ${escapeHtml(item.lotNo)}</div>`
                : ""
            }
          </td>
          <td class="text-center" style="width:56px;">${escapeHtml(item.unit)}</td>
          <td class="text-right" style="width:72px;">${item.quantity}</td>
          <td class="text-right" style="width:88px;">${item.unitPrice}</td>
          <td class="text-right" style="width:96px;">${item.amount}</td>
        </tr>
      `,
    )
    .join("");

  const emptyRows = Array.from({ length: fillerCount })
    .map(
      () => `
        <tr class="empty-row">
          <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `,
    )
    .join("");

  const bahtText = numberToThaiBahtText(data.netAmountRaw);

  return `
    <div id="goods-receipt-pdf" class="pdf-page">
      <div class="header">
        <img src="${companyLogoUrl()}" class="logo" />
        <div class="company">${companyIdentityLinesHtml({
          phoneLabel: "เบอร์ติดต่อ",
        })}
        </div>
      </div>

      <div class="header-rule"></div>
      <div class="doc-title">ใบรับสินค้า</div>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-title">ข้อมูลผู้ขาย</div>
          <div class="info-row"><span class="info-label">รหัสผู้ขาย</span><span class="info-value">${escapeHtml(data.vendorCode)}</span></div>
          <div class="info-row"><span class="info-label">ชื่อผู้ขาย</span><span class="info-value">${escapeHtml(data.vendorName)}</span></div>
          <div class="info-row"><span class="info-label">ที่อยู่</span><span class="info-value">${escapeHtml(data.vendorAddress || "—")}</span></div>
          <div class="info-row"><span class="info-label">เลขผู้เสียภาษี</span><span class="info-value">${escapeHtml(data.vendorTaxId || "—")}</span></div>
          <div class="info-row"><span class="info-label">โทร</span><span class="info-value">${escapeHtml(data.vendorPhone || "—")}</span></div>
        </div>
        <div class="info-card">
          <div class="info-card-title">ข้อมูลเอกสาร</div>
          <div class="info-row"><span class="info-label">เลขที่เอกสาร</span><span class="info-value">${escapeHtml(data.grNo)}</span></div>
          <div class="info-row"><span class="info-label">วันที่เอกสาร</span><span class="info-value">${escapeHtml(data.grDate || "—")}</span></div>
          <div class="info-row"><span class="info-label">เลขที่ PO</span><span class="info-value">${escapeHtml(data.poNo || "—")}</span></div>
          <div class="info-row"><span class="info-label">วันที่ส่งสินค้า</span><span class="info-value">${escapeHtml(data.deliveryDate || "—")}</span></div>
          <div class="info-row"><span class="info-label">ทะเบียนรถ</span><span class="info-value">${escapeHtml(data.licensePlate || "—")}</span></div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:44px;">ลำดับ</th>
            <th>รหัสสินค้า / รายละเอียด</th>
            <th style="width:56px;">หน่วย</th>
            <th style="width:72px;">จำนวน</th>
            <th style="width:88px;">ราคาต่อหน่วย</th>
            <th style="width:96px;">จำนวนเงินรวม</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${emptyRows}
        </tbody>
      </table>

      <div class="bottom-grid">
        <div class="remark-card">
          <div class="remark-label">หมายเหตุ</div>
          <div class="remark-body">${escapeHtml(data.remark || "")}</div>
          <div class="baht-text">( ${escapeHtml(bahtText)} )</div>
        </div>
        <div class="summary-card">
          <div class="summary-row"><span>รวมเป็นเงิน</span><strong>${data.subtotalAmount}</strong></div>
          <div class="summary-row"><span>ส่วนลด</span><strong>${data.discountAmount}</strong></div>
          <div class="summary-row"><span>หลังหักส่วนลด</span><strong>${data.afterDiscountAmount}</strong></div>
          <div class="summary-row"><span>ภาษีมูลค่าเพิ่ม 7%</span><strong>${data.vatAmount}</strong></div>
          <div class="summary-row net"><span>ยอดเงินสุทธิ</span><strong>${data.netAmount}</strong></div>
        </div>
      </div>

      <div class="signatures">
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.preparedBy || "")}</div>
          <div class="sig-role">ผู้จัดทำ</div>
          <div class="sig-date">วันที่ ____ / ____ / ________</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name"></div>
          <div class="sig-role">ผู้ตรวจสอบ</div>
          <div class="sig-date">วันที่ ____ / ____ / ________</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name"></div>
          <div class="sig-role">ผู้อนุมัติ</div>
          <div class="sig-date">วันที่ ____ / ____ / ________</div>
        </div>
      </div>
    </div>
  `;
}

export async function generateGoodsReceiptPdf(data: GoodsReceiptPdfData) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#fff";
  wrapper.innerHTML = `${createStyle()}${createPdfHtml(data)}`;
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector("#goods-receipt-pdf") as HTMLElement;
  const logo = wrapper.querySelector(".logo") as HTMLImageElement | null;
  if (logo && !logo.complete) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      logo.onload = done;
      logo.onerror = done;
      setTimeout(done, 3000);
    });
  }

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // รักษาสัดส่วนจริง — ไม่ยืดภาพให้เต็มหน้า A4
  if (imgHeight <= pageHeight + 1) {
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  } else {
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 2) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  }

  window.open(pdf.output("bloburl"), "_blank");
  document.body.removeChild(wrapper);
}
