import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

export type WarehouseReceiptSlipItem = {
  no: number;
  productCode: string;
  productName: string;
  warehouse: string;
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

const LOGO_URL = "/9315db73-509d-48a7-a8a8-deccea44bb93.png";

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
        width: 794px;
        min-height: 1123px;
        box-sizing: border-box;
        padding: 28px 32px 36px;
        background: #fff;
        color: #111;
        font-family: "Sarabun", "Noto Sans Thai", Tahoma, sans-serif;
        font-size: 12px;
        line-height: 1.45;
      }
      .header {
        display: grid;
        grid-template-columns: 88px 1fr;
        gap: 14px;
        align-items: center;
      }
      .logo { width: 78px; height: auto; display: block; }
      .company { text-align: center; }
      .company-name { font-size: 18px; font-weight: 700; }
      .company-address { font-size: 11px; color: #333; margin-top: 2px; }
      .doc-title {
        margin: 14px 0 12px;
        text-align: center;
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 0.04em;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.9fr;
        gap: 0;
        border: 1.2px solid #111;
      }
      .info-box {
        padding: 10px 12px;
        border-right: 1.2px solid #111;
      }
      .info-box:last-child { border-right: none; }
      .info-row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 6px;
        margin-bottom: 4px;
      }
      .info-row .label { font-weight: 600; white-space: nowrap; }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
        table-layout: fixed;
      }
      .items-table th,
      .items-table td {
        border: 1px solid #111;
        padding: 6px 8px;
        vertical-align: top;
      }
      .items-table th {
        background: #e5e7eb;
        font-weight: 700;
        text-align: center;
        font-size: 11px;
      }
      .items-table td.empty-row { height: 26px; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .summary-wrap {
        display: grid;
        grid-template-columns: 1fr 280px;
        gap: 12px;
        margin-top: 0;
        align-items: start;
      }
      .baht-text {
        margin-top: 10px;
        font-size: 12px;
        font-weight: 600;
      }
      .summary-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: -1px;
      }
      .summary-table td {
        border: 1px solid #111;
        padding: 6px 8px;
      }
      .summary-table td:first-child {
        background: #f3f4f6;
        font-weight: 600;
        width: 62%;
      }
      .summary-table tr.net td {
        font-weight: 700;
        background: #eef2ff;
      }
      .signatures {
        margin-top: 28px;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
      }
      .sig {
        text-align: center;
        padding-top: 8px;
      }
      .sig-line {
        border-bottom: 1px dotted #333;
        height: 42px;
        margin: 0 12px 8px;
      }
      .sig-name {
        font-size: 11px;
        min-height: 16px;
        margin-bottom: 4px;
      }
      .sig-role { font-weight: 700; font-size: 12px; }
      .sig-date { font-size: 11px; margin-top: 8px; color: #444; }
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
          <td>${escapeHtml(item.productCode)} ${escapeHtml(item.productName)}</td>
          <td class="text-center">${escapeHtml(item.warehouse)}</td>
          <td class="text-center">${escapeHtml(item.unit)}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">${item.unitPrice}</td>
          <td class="text-right">${item.amount}</td>
        </tr>
      `);
    } else {
      rows.push(`
        <tr>
          <td class="empty-row"></td>
          <td class="empty-row"></td>
          <td class="empty-row"></td>
          <td class="empty-row"></td>
          <td class="empty-row"></td>
          <td class="empty-row"></td>
          <td class="empty-row"></td>
        </tr>
      `);
    }
  }

  const bahtText = numberToThaiBahtText(data.netAmountRaw);

  return `
    <div id="raw-tire-warehouse-receipt-pdf" class="pdf-page">
      <div class="header">
        <div><img src="${LOGO_URL}" class="logo" /></div>
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

      <div class="doc-title">ใบรับสินค้า</div>

      <div class="info-grid">
        <div class="info-box">
          <div class="info-row"><span class="label">รหัสผู้ขาย</span><span>${escapeHtml(data.sellerCode)}</span></div>
          <div class="info-row"><span class="label">ชื่อผู้ขาย</span><span>${escapeHtml(data.sellerName)}</span></div>
          <div class="info-row"><span class="label">ที่อยู่</span><span>${escapeHtml(data.sellerAddress || "-")}</span></div>
          <div class="info-row"><span class="label">เลขประจำตัวผู้เสียภาษี</span><span>${escapeHtml(data.sellerTaxId || "-")}</span></div>
          <div class="info-row"><span class="label">โทร.</span><span>${escapeHtml(data.sellerPhone || "-")}</span></div>
        </div>
        <div class="info-box">
          <div class="info-row"><span class="label">เลขที่เอกสาร</span><span>${escapeHtml(data.documentNo)}</span></div>
          <div class="info-row"><span class="label">วันที่เอกสาร</span><span>${escapeHtml(data.documentDate)}</span></div>
          <div class="info-row"><span class="label">เลขที่ใบรับซื้อ</span><span>${escapeHtml(data.receiptNo)}</span></div>
          <div class="info-row"><span class="label">วันที่รถมาส่งสินค้า</span><span>${escapeHtml(data.deliveryDate)}</span></div>
          <div class="info-row"><span class="label">เลขทะเบียนรถ</span><span>${escapeHtml(data.licensePlate)}</span></div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width:48px;">ลำดับ</th>
            <th>รหัสสินค้า / รายละเอียด</th>
            <th style="width:100px;">คลัง</th>
            <th style="width:56px;">หน่วย</th>
            <th style="width:72px;">จำนวน</th>
            <th style="width:84px;">ราคาต่อหน่วย</th>
            <th style="width:96px;">จำนวนเงินรวม</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>

      <div class="summary-wrap">
        <div class="baht-text">( ${escapeHtml(bahtText)} )</div>
        <table class="summary-table">
          <tr><td>รวมเป็นเงิน</td><td class="text-right">${data.subtotalAmount}</td></tr>
          <tr><td>ส่วนลด</td><td class="text-right">${data.discountAmount}</td></tr>
          <tr><td>มูลค่าหลังหักส่วนลด</td><td class="text-right">${data.afterDiscountAmount}</td></tr>
          <tr><td>ภาษีมูลค่าเพิ่ม 7%</td><td class="text-right">${data.vatAmount}</td></tr>
          <tr class="net"><td>ยอดเงินสุทธิ</td><td class="text-right">${data.netAmount}</td></tr>
        </table>
      </div>

      <div class="signatures">
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.preparedBy || "")}</div>
          <div class="sig-role">ผู้จัดทำ</div>
          <div class="sig-date">วันที่ ___/___/______</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.verifiedBy || "")}</div>
          <div class="sig-role">ผู้ตรวจสอบ</div>
          <div class="sig-date">วันที่ ___/___/______</div>
        </div>
        <div class="sig">
          <div class="sig-line"></div>
          <div class="sig-name">${escapeHtml(data.approvedBy || "")}</div>
          <div class="sig-role">ผู้อนุมัติ</div>
          <div class="sig-date">วันที่ ___/___/______</div>
        </div>
      </div>
    </div>
  `;
}

export async function generateRawTireWarehouseReceiptPdf(
  data: WarehouseReceiptSlipData,
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
