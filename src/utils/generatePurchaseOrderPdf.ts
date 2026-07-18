import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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

export type PurchaseOrderPdfData = {
  poNo: string;
  poDate: string;
  vendorName: string;
  vendorCode: string;
  paymentTerm: string;
  taxLabel: string;
  prNo: string;
  createdBy: string;
  remark: string;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  items: PurchaseOrderPdfItem[];
};

const LOGO_URL = "/9315db73-509d-48a7-a8a8-deccea44bb93.png";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatQty(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function createPdfHtml(data: PurchaseOrderPdfData) {
  const rows = data.items
    .map(
      (item) => `
        <tr class="data-row">
          <td class="text-center col-no">${item.no}</td>
          <td class="text-center col-code">${escapeHtml(item.itemCode)}</td>
          <td class="col-name">${escapeHtml(item.itemName)}</td>
          <td class="text-center col-unit">${escapeHtml(item.unit)}</td>
          <td class="text-right col-qty">${formatQty(item.qty)}</td>
          <td class="text-right col-price">${formatMoney(item.unitPrice)}</td>
          <td class="text-right col-disc">${formatMoney(item.discountAmount)}</td>
          <td class="text-right col-amount">${formatMoney(item.amount)}</td>
        </tr>
      `,
    )
    .join("");

  const emptyRows = Array.from({
    length: Math.max(0, 5 - data.items.length),
  })
    .map(
      () => `
        <tr class="empty-row">
          <td>&nbsp;</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `,
    )
    .join("");

  const remarkBlock = data.remark
    ? `
      <div class="remark-box">
        <span class="label">หมายเหตุ</span>
        <span class="value">${escapeHtml(data.remark)}</span>
      </div>
    `
    : "";

  return `
    <div id="purchase-order-pdf" class="pdf-page">
      <div class="header">
        <div class="logo-box">
          <img src="${LOGO_URL}" class="logo" crossorigin="anonymous" />
        </div>
        <div class="company">
          <div class="company-name">บริษัท เอสเอ็มที เอนเนอร์ยี่ จำกัด</div>
          <div class="company-address">
            85 ถนนโยธา แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100
          </div>
          <div class="company-address">
            เบอร์ออฟฟิศ : 02-2359565-8 · เลขประจำตัวผู้เสียภาษี 0105563023124
          </div>
        </div>
      </div>

      <div class="header-rule"></div>

      <div class="title-block">
        <div class="title">ใบสั่งซื้อ</div>
        <div class="title-sub">PURCHASE ORDER</div>
      </div>

      <div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">เลขที่เอกสาร</span>
          <strong class="meta-value">${escapeHtml(data.poNo)}</strong>
        </div>
      </div>

      <div class="info-card">
        <div class="info-grid">
          <div class="info-row">
            <span class="label">ผู้ขาย / เจ้าหนี้</span>
            <span class="value">${escapeHtml(data.vendorName)}</span>
          </div>
          <div class="info-row">
            <span class="label">วันที่เอกสาร</span>
            <span class="value">${escapeHtml(data.poDate)}</span>
          </div>
          <div class="info-row">
            <span class="label">รหัสผู้ขาย</span>
            <span class="value">${escapeHtml(data.vendorCode)}</span>
          </div>
          <div class="info-row">
            <span class="label">อ้างอิง PR</span>
            <span class="value">${escapeHtml(data.prNo)}</span>
          </div>
          <div class="info-row">
            <span class="label">เงื่อนไขชำระเงิน</span>
            <span class="value">${escapeHtml(data.paymentTerm)}</span>
          </div>
          <div class="info-row">
            <span class="label">ภาษี</span>
            <span class="value">${escapeHtml(data.taxLabel)}</span>
          </div>
          <div class="info-row info-row-full">
            <span class="label">ผู้จัดทำ</span>
            <span class="value">${escapeHtml(data.createdBy)}</span>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th class="col-no">ลำดับ</th>
            <th class="col-code">รหัสสินค้า</th>
            <th class="col-name">รายการ</th>
            <th class="col-unit">หน่วย</th>
            <th class="col-qty">จำนวน</th>
            <th class="col-price">ราคา/หน่วย</th>
            <th class="col-disc">ส่วนลด</th>
            <th class="col-amount">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${emptyRows}
        </tbody>
      </table>

      <div class="totals-row">
        <div class="totals-spacer"></div>
        <div class="totals-box">
          <div class="total-line">
            <span>Subtotal</span>
            <strong>${formatMoney(data.subtotalAmount)}</strong>
          </div>
          <div class="total-line">
            <span>ส่วนลด</span>
            <strong>${formatMoney(data.discountAmount)}</strong>
          </div>
          <div class="total-line">
            <span>VAT</span>
            <strong>${formatMoney(data.vatAmount)}</strong>
          </div>
          <div class="total-line total-line-grand">
            <span>รวมทั้งสิ้น</span>
            <strong>${formatMoney(data.totalAmount)}</strong>
          </div>
        </div>
      </div>

      ${remarkBlock}

      <div class="signature-box">
        <div class="signature">
          <div class="sig-title">ผู้จัดทำ</div>
          <div class="sig-line"></div>
          <div class="sig-date">วันที่ _____ / _____ / _____</div>
        </div>
        <div class="signature">
          <div class="sig-title">ผู้อนุมัติ</div>
          <div class="sig-line"></div>
          <div class="sig-date">วันที่ _____ / _____ / _____</div>
        </div>
        <div class="signature">
          <div class="sig-title">ผู้ขาย / รับทราบ</div>
          <div class="sig-line"></div>
          <div class="sig-date">วันที่ _____ / _____ / _____</div>
        </div>
      </div>

      <div class="footer-note">
        เอกสารนี้สร้างจากระบบ ERP · SMT Energy · ใช้สำหรับสั่งซื้อสินค้า/บริการ
      </div>
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

      .logo-box {
        display: flex;
        align-items: center;
      }

      .logo {
        width: 168px;
        height: auto;
        max-height: 72px;
        object-fit: contain;
        display: block;
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
        letter-spacing: 0.8px;
      }

      .meta-bar {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }

      .meta-item {
        display: flex;
        align-items: baseline;
        gap: 10px;
        border: 1.2px solid #d1d5db;
        background: #f9fafb;
        padding: 8px 14px;
        min-width: 240px;
        border-radius: 2px;
      }

      .meta-label {
        font-size: 11px;
        color: #6b7280;
        font-weight: 600;
      }

      .meta-value {
        font-size: 13px;
        color: #111827;
        font-weight: 700;
      }

      .info-card {
        margin-top: 16px;
        border: 1.2px solid #e5e7eb;
        background: #fcfcfd;
        padding: 14px 16px;
        border-radius: 2px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px 28px;
      }

      .info-row {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 8px;
        align-items: start;
      }

      .info-row-full {
        grid-column: 1 / -1;
      }

      .label {
        font-size: 11px;
        color: #6b7280;
        font-weight: 700;
      }

      .value {
        font-size: 12px;
        color: #111827;
        font-weight: 600;
        line-height: 1.4;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 18px;
        table-layout: fixed;
        font-size: 11px;
      }

      .items-table th,
      .items-table td {
        border: 1.2px solid #9ca3af;
        padding: 7px 6px;
        vertical-align: middle;
        white-space: nowrap;
      }

      .items-table th {
        background: #f3f4f6;
        text-align: center;
        font-weight: 700;
        color: #111827;
        height: 34px;
      }

      .items-table tbody tr.data-row td {
        height: 30px;
      }

      .items-table tbody tr.empty-row td {
        height: 30px;
        color: transparent;
      }

      .col-no { width: 42px; }
      .col-code {
        width: 110px;
        font-size: 10px;
        letter-spacing: -0.1px;
      }
      .col-name {
        width: auto;
        white-space: normal;
        word-break: break-word;
      }
      .col-unit { width: 56px; }
      .col-qty { width: 62px; }
      .col-price { width: 78px; }
      .col-disc { width: 68px; }
      .col-amount { width: 82px; }

      .text-center { text-align: center; }
      .text-right { text-align: right; }

      .totals-row {
        display: grid;
        grid-template-columns: 1fr 260px;
        border: 1.2px solid #9ca3af;
        border-top: 0;
      }

      .totals-spacer {
        border-right: 1.2px solid #9ca3af;
        background: #fff;
      }

      .totals-box {
        padding: 10px 14px;
        background: #fafafa;
      }

      .total-line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 4px 0;
        font-size: 12px;
        color: #374151;
      }

      .total-line strong {
        font-weight: 700;
        color: #111827;
      }

      .total-line-grand {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid #d1d5db;
        font-size: 13px;
        font-weight: 700;
        color: #111827;
      }

      .remark-box {
        margin-top: 14px;
        border: 1.2px solid #e5e7eb;
        background: #fcfcfd;
        padding: 12px 14px;
        display: grid;
        grid-template-columns: 70px 1fr;
        gap: 8px;
      }

      .signature-box {
        margin-top: 16px;
        border: 1.2px solid #9ca3af;
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        min-height: 120px;
      }

      .signature {
        padding: 16px 18px 14px;
        border-right: 1.2px solid #9ca3af;
      }

      .signature:last-child {
        border-right: 0;
      }

      .sig-title {
        font-size: 12px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 36px;
      }

      .sig-line {
        border-bottom: 1px dashed #6b7280;
        margin-bottom: 10px;
      }

      .sig-date {
        font-size: 11px;
        color: #4b5563;
        font-weight: 600;
      }

      .footer-note {
        margin-top: 14px;
        text-align: center;
        font-size: 10px;
        color: #9ca3af;
      }
    </style>
  `;
}

async function waitForLogo(wrapper: HTMLElement) {
  const logo = wrapper.querySelector(".logo") as HTMLImageElement | null;
  if (!logo) return;

  if (logo.complete && logo.naturalWidth > 0) return;

  await new Promise<void>((resolve) => {
    const done = () => resolve();
    logo.onload = done;
    logo.onerror = done;
    setTimeout(done, 3000);
  });
}

export async function generatePurchaseOrderPdf(data: PurchaseOrderPdfData) {
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

  const target = wrapper.querySelector("#purchase-order-pdf") as HTMLElement;
  await waitForLogo(wrapper);

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

  // ถ้าพอดีหน้าเดียว ไม่สร้างหน้าสองจากเศษพิกเซล
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
