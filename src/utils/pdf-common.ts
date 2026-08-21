import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  formatTaxId,
  getCompanyInfoSnapshot,
} from "@/lib/company/company-info";

/** โลโก้สำรอง ใช้เมื่อยังไม่ได้ตั้งค่าโลโก้ใน master ข้อมูลบริษัท */
export const PDF_LOGO_URL = "/9315db73-509d-48a7-a8a8-deccea44bb93.png";

/** โลโก้ที่ตั้งไว้ใน master ข้อมูลบริษัท (ตกมาที่ค่าสำรองถ้าไม่ได้ตั้ง) */
export function companyLogoUrl() {
  return getCompanyInfoSnapshot().logoUrl;
}

/**
 * สามบรรทัดข้อมูลบริษัทบนหัวเอกสาร — ดึงจาก master `ข้อมูลบริษัท`
 *
 * คืนแค่เนื้อข้อความ ไม่รวมกล่องครอบหรือโลโก้ เพราะเอกสารแต่ละใบมี CSS และ
 * โครง HTML ของตัวเอง (บางใบมี `.logo-box` บางใบใช้ `<img>` เปล่า) ถ้าคืนทั้งก้อน
 * หัวเอกสารบางใบจะเพี้ยน
 *
 * `phoneLabel` กับ `taxIdStyle` ตั้งได้ต่อเอกสาร เพื่อคงหน้าตาที่แต่ละใบเคยพิมพ์ออกมา
 */
export function companyIdentityLinesHtml(options?: {
  phoneLabel?: string;
  taxIdStyle?: "plain" | "grouped";
  /** ตัวคั่นระหว่างเบอร์โทรกับเลขผู้เสียภาษี — ใบรับยางเข้าคลังใช้เว้นวรรคเปล่า */
  separator?: string;
}) {
  const {
    phoneLabel = "เบอร์ออฟฟิศ",
    taxIdStyle = "plain",
    separator = " · ",
  } = options ?? {};
  const company = getCompanyInfoSnapshot();

  const contactParts: string[] = [];
  if (company.phone) {
    contactParts.push(`${phoneLabel} : ${escapeHtml(company.phone)}`);
  }
  if (company.taxId) {
    contactParts.push(
      `เลขประจำตัวผู้เสียภาษี ${escapeHtml(formatTaxId(company.taxId, taxIdStyle))}`,
    );
  }

  return `
        <div class="company-name">${escapeHtml(company.nameTh)}</div>
        <div class="company-address">
          ${escapeHtml(company.addressText)}
        </div>${
          contactParts.length > 0
            ? `
        <div class="company-address">
          ${contactParts.join(separator)}
        </div>`
            : ""
        }`;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatMoney(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatQty(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

export function companyHeaderHtml() {
  return `
    <div class="header">
      <div class="logo-box">
        <img src="${companyLogoUrl()}" class="logo" crossorigin="anonymous" />
      </div>
      <div class="company">${companyIdentityLinesHtml()}
      </div>
    </div>
    <div class="header-rule"></div>
  `;
}

export function basePdfStyles() {
  return `
    <style>
      .pdf-page {
        width: 794px;
        box-sizing: border-box;
        padding: 28px 32px 24px;
        background: #fff;
        color: #111827;
        font-family: "Sarabun", "Tahoma", "Segoe UI", sans-serif;
        font-size: 12px;
        line-height: 1.45;
      }
      .header {
        display: grid;
        grid-template-columns: 72px 1fr;
        gap: 14px;
        align-items: center;
      }
      .logo-box {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
      }
      .logo {
        max-width: 64px;
        max-height: 64px;
        object-fit: contain;
      }
      .company-name {
        font-size: 16px;
        font-weight: 700;
        color: #111827;
      }
      .company-address {
        font-size: 11px;
        color: #4b5563;
      }
      .header-rule {
        margin: 12px 0 14px;
        border-top: 2px solid #6f9720;
      }
      .title-block {
        text-align: center;
        margin-bottom: 14px;
      }
      .title {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .title-sub {
        margin-top: 2px;
        font-size: 11px;
        color: #6b7280;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .meta-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px 18px;
        margin-bottom: 12px;
        padding: 8px 12px;
        background: #f4f7ef;
        border: 1px solid #e4e8df;
        border-radius: 8px;
      }
      .meta-label {
        display: block;
        font-size: 10px;
        color: #6b7280;
        font-weight: 600;
      }
      .meta-value {
        font-size: 13px;
        font-weight: 700;
      }
      .info-card {
        border: 1.2px solid #d1d5db;
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 12px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 16px;
      }
      .info-row {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 8px;
      }
      .info-row-full { grid-column: 1 / -1; }
      .info-row .label {
        color: #6b7280;
        font-size: 11px;
        font-weight: 600;
      }
      .info-row .value {
        color: #111827;
        font-weight: 600;
      }
      .info-row-emphasis {
        padding: 6px 8px;
        margin: 0 -4px;
        border-radius: 6px;
        background: #f3f8e8;
        border: 1px solid #d5e4b0;
      }
      .info-row-emphasis .label {
        color: #6f9720;
        font-weight: 700;
      }
      .info-row-emphasis .value {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.01em;
      }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        border: 1.2px solid #9ca3af;
        table-layout: fixed;
      }
      .items-table th,
      .items-table td {
        border: 1px solid #9ca3af;
        padding: 5px 6px;
        vertical-align: middle;
      }
      .items-table th {
        background: #f3f4f6;
        text-align: center;
        font-weight: 700;
        height: 34px;
      }
      .items-table tbody tr.data-row td { height: 30px; }
      .items-table tbody tr.empty-row td {
        height: 30px;
        color: transparent;
      }
      .col-no { width: 42px; }
      .col-code { width: 100px; font-size: 10px; }
      .col-name { width: auto; word-break: break-word; white-space: normal; }
      .col-unit { width: 56px; }
      .col-qty { width: 70px; }
      .col-price { width: 78px; }
      .col-disc { width: 68px; }
      .col-amount { width: 82px; }
      .col-extra { width: 90px; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .totals-row {
        display: grid;
        grid-template-columns: 1fr 260px;
        border: 1.2px solid #9ca3af;
        border-top: 0;
      }
      .totals-spacer { border-right: 1.2px solid #9ca3af; }
      .totals-box { padding: 10px 14px; background: #fafafa; }
      .total-line {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 4px 0;
        font-size: 12px;
        color: #374151;
      }
      .total-line strong { font-weight: 700; color: #111827; }
      .total-line-grand {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid #d1d5db;
        font-size: 13px;
        font-weight: 700;
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
        min-height: 110px;
      }
      .signature {
        padding: 14px 16px;
        border-right: 1.2px solid #9ca3af;
      }
      .signature:last-child { border-right: 0; }
      .sig-title {
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 36px;
      }
      .sig-line {
        border-bottom: 1px dashed #6b7280;
        margin-bottom: 10px;
      }
      .sig-date { font-size: 11px; color: #4b5563; font-weight: 600; }
      .footer-note {
        margin-top: 14px;
        text-align: center;
        font-size: 10px;
        color: #9ca3af;
      }
      .qr-box {
        margin-top: 12px;
        text-align: center;
      }
      .qr-box img {
        width: 120px;
        height: 120px;
        object-fit: contain;
      }
    </style>
  `;
}

async function waitForImages(wrapper: HTMLElement) {
  const images = Array.from(wrapper.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.onload = done;
          img.onerror = done;
          setTimeout(done, 3000);
        }),
    ),
  );
}

export async function openPdfFromHtml(pageId: string, pageHtml: string) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#fff";
  wrapper.innerHTML = `${basePdfStyles()}${pageHtml}`;
  document.body.appendChild(wrapper);

  const target = wrapper.querySelector(`#${pageId}`) as HTMLElement | null;
  if (!target) {
    document.body.removeChild(wrapper);
    throw new Error("PDF template root not found");
  }

  await waitForImages(wrapper);

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

/** ความสูง A4 แนวตั้งที่ 794px กว้าง — ใช้ตรึงความสูงหน้ารายงานให้ตัดหน้าพอดี */
export const PDF_PAGE_HEIGHT_PX = 1123;

/**
 * รายงานหลายหน้า — แคปทีละหน้าแล้วต่อเป็น PDF
 *
 * ต่างจาก `openPdfFromHtml` ที่แคปยาวรวดเดียวแล้วหั่นตามความสูง A4
 * ซึ่งจะตัดกลางแถวตาราง วิธีนี้ผู้เรียกแบ่งแถวเป็นหน้าเองแล้วได้หัวตารางซ้ำทุกหน้า
 */
export async function openMultiPagePdfFromHtml(
  pageId: string,
  pagesHtml: string[],
) {
  if (pagesHtml.length === 0) {
    throw new Error("PDF has no pages to render");
  }

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#fff";
  wrapper.innerHTML = `${basePdfStyles()}${pagesHtml.join("")}`;
  document.body.appendChild(wrapper);

  try {
    await waitForImages(wrapper);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    for (let index = 0; index < pagesHtml.length; index += 1) {
      const target = wrapper.querySelector(
        `#${pageId}-${index}`,
      ) as HTMLElement | null;
      if (!target) {
        throw new Error(`PDF page ${index} not found`);
      }

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
      });

      if (index > 0) {
        pdf.addPage();
      }
      // แต่ละหน้าถูกตรึงความสูงไว้แล้ว จึงวางเต็มหน้า A4 ได้ตรงๆ
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
    }

    window.open(pdf.output("bloburl"), "_blank");
  } finally {
    document.body.removeChild(wrapper);
  }
}

export type SalesLinePdfItem = {
  no: number;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice?: number;
  discountAmount?: number;
  amount?: number;
  extra?: string;
};

export type SalesCommercialPdfData = {
  pageId: string;
  titleTh: string;
  titleEn: string;
  docNo: string;
  docDate: string;
  infoRows: Array<{
    label: string;
    value: string;
    full?: boolean;
    emphasis?: boolean;
  }>;
  items: SalesLinePdfItem[];
  withPrices: boolean;
  subtotalAmount?: number;
  discountAmount?: number;
  vatAmount?: number;
  totalAmount?: number;
  remark?: string;
  signatures?: [string, string, string];
};

export async function generateSalesCommercialPdf(data: SalesCommercialPdfData) {
  const priceCols = data.withPrices;
  const rows = data.items
    .map((item) => {
      if (priceCols) {
        return `
          <tr class="data-row">
            <td class="text-center col-no">${item.no}</td>
            <td class="text-center col-code">${escapeHtml(item.itemCode)}</td>
            <td class="col-name">${escapeHtml(item.itemName)}</td>
            <td class="text-center col-unit">${escapeHtml(item.unit)}</td>
            <td class="text-right col-qty">${formatQty(item.qty)}</td>
            <td class="text-right col-price">${formatMoney(item.unitPrice ?? 0)}</td>
            <td class="text-right col-disc">${formatMoney(item.discountAmount ?? 0)}</td>
            <td class="text-right col-amount">${formatMoney(item.amount ?? 0)}</td>
          </tr>`;
      }
      return `
        <tr class="data-row">
          <td class="text-center col-no">${item.no}</td>
          <td class="text-center col-code">${escapeHtml(item.itemCode)}</td>
          <td class="col-name">${escapeHtml(item.itemName)}</td>
          <td class="text-center col-unit">${escapeHtml(item.unit)}</td>
          <td class="text-right col-qty">${formatQty(item.qty)}</td>
          ${item.extra != null ? `<td class="text-center col-extra">${escapeHtml(item.extra)}</td>` : ""}
        </tr>`;
    })
    .join("");

  const colCount = priceCols ? 8 : data.items.some((i) => i.extra != null) ? 6 : 5;
  const emptyRows = Array.from({ length: Math.max(0, 5 - data.items.length) })
    .map(
      () =>
        `<tr class="empty-row">${Array.from({ length: colCount })
          .map(() => "<td>&nbsp;</td>")
          .join("")}</tr>`,
    )
    .join("");

  const infoHtml = data.infoRows
    .map((row) => {
      const classes = [
        "info-row",
        row.full ? "info-row-full" : "",
        row.emphasis ? "info-row-emphasis" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
      <div class="${classes}">
        <span class="label">${escapeHtml(row.label)}</span>
        <span class="value">${escapeHtml(row.value)}</span>
      </div>`;
    })
    .join("");

  const headerCells = priceCols
    ? `<th class="col-no">#</th><th class="col-code">รหัส</th><th class="col-name">รายการ</th><th class="col-unit">หน่วย</th><th class="col-qty">จำนวน</th><th class="col-price">ราคา</th><th class="col-disc">ส่วนลด</th><th class="col-amount">จำนวนเงิน</th>`
    : data.items.some((i) => i.extra != null)
      ? `<th class="col-no">#</th><th class="col-code">รหัส</th><th class="col-name">รายการ</th><th class="col-unit">หน่วย</th><th class="col-qty">จำนวน</th><th class="col-extra">หมายเหตุ</th>`
      : `<th class="col-no">#</th><th class="col-code">รหัส</th><th class="col-name">รายการ</th><th class="col-unit">หน่วย</th><th class="col-qty">จำนวน</th>`;

  const totalsHtml = priceCols
    ? `
    <div class="totals-row">
      <div class="totals-spacer"></div>
      <div class="totals-box">
        <div class="total-line"><span>ยอดรวม</span><strong>${formatMoney(data.subtotalAmount ?? 0)}</strong></div>
        <div class="total-line"><span>ส่วนลด</span><strong>${formatMoney(data.discountAmount ?? 0)}</strong></div>
        <div class="total-line"><span>ภาษีมูลค่าเพิ่ม</span><strong>${formatMoney(data.vatAmount ?? 0)}</strong></div>
        <div class="total-line total-line-grand"><span>ยอดสุทธิ</span><strong>${formatMoney(data.totalAmount ?? 0)}</strong></div>
      </div>
    </div>`
    : "";

  const remarkHtml = data.remark
    ? `<div class="remark-box"><strong>หมายเหตุ</strong><div>${escapeHtml(data.remark)}</div></div>`
    : "";

  const sigs = data.signatures ?? ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"];
  const signatureHtml = `
    <div class="signature-box">
      ${sigs
        .map(
          (title) => `
        <div class="signature">
          <div class="sig-title">${escapeHtml(title)}</div>
          <div class="sig-line"></div>
          <div class="sig-date">วันที่ ....../....../..........</div>
        </div>`,
        )
        .join("")}
    </div>`;

  const html = `
    <div id="${data.pageId}" class="pdf-page">
      ${companyHeaderHtml()}
      <div class="title-block">
        <div class="title">${escapeHtml(data.titleTh)}</div>
        <div class="title-sub">${escapeHtml(data.titleEn)}</div>
      </div>
      <div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">เลขที่เอกสาร</span>
          <strong class="meta-value">${escapeHtml(data.docNo)}</strong>
        </div>
        <div class="meta-item">
          <span class="meta-label">วันที่</span>
          <strong class="meta-value">${escapeHtml(data.docDate)}</strong>
        </div>
      </div>
      <div class="info-card"><div class="info-grid">${infoHtml}</div></div>
      <table class="items-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${rows}${emptyRows}</tbody>
      </table>
      ${totalsHtml}
      ${remarkHtml}
      ${signatureHtml}
      <div class="footer-note">เอกสารออกจากระบบ ERP · SMT Energy</div>
    </div>
  `;

  await openPdfFromHtml(data.pageId, html);
}
