import {
  companyIdentityLinesHtml,
  companyLogoUrl,
  ensureCompanyInfo,
} from "./pdf-common";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

export type WarehouseReceiptSlipItem = {
  no: number;
  productCode: string;
  productName: string;
  warehouse: string;
  lotNo: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

export type WarehouseReceiptSlipData = {
  documentNo: string;
  documentDate: string;
  receiptNo: string;
  deliveryDate: string;
  licensePlate: string;
  sellerCode: string;
  sellerName: string;
  sellerAddress: string;
  sellerTaxId: string;
  sellerPhone: string;
  remark: string;
  items: WarehouseReceiptSlipItem[];
  subtotalAmount: string;
  discountAmount: string;
  afterDiscountAmount: string;
  vatAmount: string;
  netAmount: string;
  netAmountRaw: number;
  preparedBy: string;
  verifiedBy: string;
  approvedBy: string;
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
      .pdf-page {
        --line: #6b7280;
        --header-bg: #e5e7eb;
        width: 794px;
        min-height: 1123px;
        box-sizing: border-box;
        padding: 24px 28px 28px;
        background: #fff;
        color: #111;
        font-family: "Sarabun", "Noto Sans Thai", Tahoma, sans-serif;
        font-size: 12.5px;
        line-height: 1.45;
      }
      .header {
        position: relative;
        min-height: 78px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }
      .logo {
        position: absolute;
        left: 0;
        top: 0;
        width: 72px;
        height: auto;
        display: block;
      }
      .company {
        text-align: center;
        max-width: 520px;
        margin: 0 auto;
        padding: 0 76px;
      }
      .company-name { font-size: 17px; font-weight: 500; }
      .company-address { font-size: 11.5px; color: #1f2937; margin-top: 3px; }
      .doc-title {
        margin: 14px 0 12px;
        text-align: center;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: 0.06em;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1.15fr 0.95fr;
        border: 1px solid var(--line);
      }
      .info-box {
        padding: 10px 12px;
        border-right: 1px solid var(--line);
        min-height: 128px;
      }
      .info-box:last-child { border-right: none; }
      .info-row {
        display: grid;
        grid-template-columns: 118px 1fr;
        column-gap: 8px;
        margin-bottom: 5px;
      }
      .info-label { font-weight: 500; white-space: nowrap; }
      .meta-grid {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .meta-cell {
        display: grid;
        grid-template-columns: 130px 1fr;
        column-gap: 8px;
        align-items: baseline;
      }
      .meta-label { font-weight: 500; white-space: nowrap; }
      .meta-value { word-break: keep-all; white-space: nowrap; }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        table-layout: fixed;
      }
      .items-table th,
      .items-table td {
        border: 1px solid var(--line);
        padding: 5px 6px;
        vertical-align: middle;
        font-size: 12px;
      }
      .items-table th {
        background: var(--header-bg);
        font-weight: 500;
        text-align: center;
        height: 32px;
      }
      .empty-row td { height: 28px; }
      .warehouse-line {
        margin-top: 2px;
        color: #6f9720;
        font-size: 11.5px;
        font-weight: 500;
      }
      .lot-line {
        margin-top: 1px;
        color: #8ab933;
        font-size: 11.5px;
        font-weight: 500;
      }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .footer-block {
        display: grid;
        grid-template-columns: 1fr 250px;
        border: 1px solid var(--line);
        border-top: none;
        min-height: 148px;
      }
      .remark-pane {
        display: flex;
        flex-direction: column;
        padding: 8px 10px 10px;
        border-right: 1px solid var(--line);
      }
      .remark-label { font-weight: 500; margin-bottom: 6px; }
      .remark-body { flex: 1; min-height: 48px; white-space: pre-wrap; }
      .baht-text {
        margin-top: auto;
        padding-top: 10px;
        font-size: 12.5px;
        font-weight: 500;
        text-align: center;
      }
      .summary-table {
        width: 100%;
        height: 100%;
        border-collapse: collapse;
      }
      .summary-table td {
        border-bottom: 1px solid var(--line);
        padding: 6px 8px;
        font-size: 12px;
      }
      .summary-table tr:last-child td { border-bottom: none; }
      .summary-table td:first-child {
        font-weight: 500;
        width: 68%;
        border-right: 1px solid var(--line);
        background: #f9fafb;
      }
      .summary-table tr.net td { font-weight: 500; }
      .signatures {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        margin-top: 22px;
        border: 1px solid var(--line);
        min-height: 120px;
      }
      .sig {
        text-align: center;
        padding: 14px 10px 12px;
        border-right: 1px solid var(--line);
      }
      .sig:last-child { border-right: none; }
      .sig-line {
        width: calc(100% - 28px);
        margin: 0 auto 8px;
        border-bottom: 1px dotted #4b5563;
        height: 36px;
      }
      .sig-name { min-height: 16px; font-size: 11.5px; margin-bottom: 2px; }
      .sig-role { font-weight: 500; font-size: 12.5px; }
      .sig-date { margin-top: 10px; font-size: 11.5px; color: #374151; }
    </style>
  `;
}

function createPdfHtml(data: WarehouseReceiptSlipData) {
  const minRows = Math.max(8, data.items.length);
  const rows: string[] = [];
  for (let i = 0; i < minRows; i += 1) {
    const item = data.items[i];
    if (item) {
      rows.push(`
        <tr>
          <td class="text-center">${item.no}</td>
          <td>
            <div>${escapeHtml(item.productCode)} ${escapeHtml(item.productName)}</div>
            <div class="warehouse-line">คลัง : ${escapeHtml(item.warehouse)}</div>
            ${
              item.lotNo
                ? `<div class="lot-line">Lot : ${escapeHtml(item.lotNo)}</div>`
                : ""
            }
          </td>
          <td class="text-center">${escapeHtml(item.unit)}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.unitPrice}</td>
          <td class="text-right">${item.amount}</td>
        </tr>
      `);
    } else {
      rows.push(`
        <tr class="empty-row">
          <td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `);
    }
  }

  const bahtText = numberToThaiBahtText(data.netAmountRaw);

  return `
    <div id="raw-tire-warehouse-receipt-pdf" class="pdf-page">
      <div class="header">
        <img src="${companyLogoUrl()}" class="logo" />
        <div class="company">${companyIdentityLinesHtml({
          phoneLabel: "เบอร์ติดต่อ",
          taxIdStyle: "grouped",
          separator: " ",
        })}
        </div>
      </div>

      <div class="doc-title">ใบรับสินค้า</div>

      <div class="info-grid">
        <div class="info-box">
          <div class="info-row"><span class="info-label">รหัสผู้ขาย</span><span>${escapeHtml(data.sellerCode)}</span></div>
          <div class="info-row"><span class="info-label">ชื่อผู้ขาย</span><span>${escapeHtml(data.sellerName)}</span></div>
          <div class="info-row"><span class="info-label">ที่อยู่</span><span>${escapeHtml(data.sellerAddress || " ")}</span></div>
          <div class="info-row"><span class="info-label">เลขประจำตัวผู้เสียภาษี</span><span>${escapeHtml(data.sellerTaxId || " ")}</span></div>
          <div class="info-row"><span class="info-label">โทร</span><span>${escapeHtml(data.sellerPhone || " ")}</span></div>
        </div>
        <div class="info-box">
          <div class="meta-grid">
            <div class="meta-cell"><span class="meta-label">เลขที่เอกสาร</span><span class="meta-value">${escapeHtml(data.documentNo)}</span></div>
            <div class="meta-cell"><span class="meta-label">วันที่เอกสาร</span><span class="meta-value">${escapeHtml(data.documentDate || " ")}</span></div>
            <div class="meta-cell"><span class="meta-label">เลขที่ PO</span><span class="meta-value">${escapeHtml(data.receiptNo)}</span></div>
            <div class="meta-cell"><span class="meta-label">วันที่รถมาส่งสินค้า</span><span class="meta-value">${escapeHtml(data.deliveryDate)}</span></div>
            <div class="meta-cell"><span class="meta-label">เลขทะเบียนรถ</span><span class="meta-value">${escapeHtml(data.licensePlate || " ")}</span></div>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:48px;">ลำดับ</th>
            <th>รหัสสินค้า / รายละเอียด</th>
            <th style="width:56px;">หน่วย</th>
            <th style="width:72px;">จำนวน</th>
            <th style="width:88px;">ราคาต่อหน่วย</th>
            <th style="width:100px;">จำนวนเงินรวม</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>

      <div class="footer-block">
        <div class="remark-pane">
          <div class="remark-label">หมายเหตุ</div>
          <div class="remark-body">${escapeHtml(data.remark || "")}</div>
          <div class="baht-text">( ${escapeHtml(bahtText)} )</div>
        </div>
        <table class="summary-table">
          <tr><td>รวมเป็นเงิน</td><td class="text-right">${data.subtotalAmount}</td></tr>
          <tr><td>ยอดหัก</td><td class="text-right">${data.discountAmount}</td></tr>
          <tr><td>หลังหัก</td><td class="text-right">${data.afterDiscountAmount}</td></tr>
          <tr><td>ภาษีมูลค่าเพิ่ม 7%</td><td class="text-right">${data.vatAmount}</td></tr>
          <tr class="net"><td>ยอดเงินสุทธิ</td><td class="text-right">${data.netAmount}</td></tr>
        </table>
      </div>

      <div class="signatures">
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.preparedBy || "")}</div>
          <div class="sig-role">ผู้จัดทำ</div>
          <div class="sig-date">วันที่ ____/____/________</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.verifiedBy || "")}</div>
          <div class="sig-role">ผู้ตรวจสอบ</div>
          <div class="sig-date">วันที่ ____/____/________</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.approvedBy || "")}</div>
          <div class="sig-role">ผู้อนุมัติ</div>
          <div class="sig-date">วันที่ ____/____/________</div>
        </div>
      </div>
    </div>
  `;
}

export async function generateRawTireWarehouseReceiptPdf(
  data: WarehouseReceiptSlipData,
) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#fff";
  wrapper.innerHTML = `${createStyle()}${createPdfHtml(data)}`;
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector(
    "#raw-tire-warehouse-receipt-pdf",
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
