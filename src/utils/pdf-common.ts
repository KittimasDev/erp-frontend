import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  ensureCompanyInfo as loadCompanyInfo,
  formatTaxId,
  getCompanyInfoSnapshot,
} from "@/lib/company/company-info";
import { sanitizeDocumentHtml } from "@/lib/html/sanitize-document-html";
import { reportUserError } from "@/lib/ui/toast-bridge";

/**
 * โหลดข้อมูลบริษัทก่อนประกอบเอกสาร — generator ทุกตัวเรียกตัวนี้เป็นอย่างแรก
 *
 * แจ้งผู้ใช้ให้เห็นก่อนโยนต่อ เพราะ call site หลายจุดเรียกแบบ fire-and-forget
 * ไม่มี catch ถ้าไม่แจ้งที่นี่ กดปุ่มพิมพ์แล้วจะเงียบหายไปเฉย ๆ
 */
export async function ensureCompanyInfo() {
  try {
    return await loadCompanyInfo();
  } catch (error) {
    reportUserError(
      error instanceof Error
        ? error.message
        : "โหลดข้อมูลบริษัทไม่สำเร็จ — ยังสร้างเอกสารไม่ได้",
    );
    throw error;
  }
}

/**
 * โลโก้บนหัวเอกสาร — ไฟล์ที่อัปโหลดไว้ (data URI) ชนะ path ที่พิมพ์เอง
 * data URI ไม่ทำให้ canvas ของ html2canvas taint จึงพิมพ์ออกมาได้แน่นอน
 */
export function companyLogoUrl() {
  const company = getCompanyInfoSnapshot();
  return company.logoDataUrl ?? company.logoUrl;
}

/** ชื่อที่ใช้ท้ายเอกสาร — ชื่อย่อถ้ามี ไม่งั้นชื่อเต็ม */
export function companyBrandName() {
  return getCompanyInfoSnapshot().shortName;
}

/**
 * บรรทัดบัญชีธนาคารหลัก สำหรับเอกสารกลุ่มขายที่ลูกค้าต้องโอนเงินเข้ามา
 * ไม่มีบัญชีหลักที่ active → คืนค่าว่าง ให้เอกสารไม่ต้องขึ้นบรรทัดนี้เลย
 */
export function companyBankLineHtml() {
  const account = getCompanyInfoSnapshot().bankAccount;
  if (!account) {
    return "";
  }

  const parts: string[] = [];
  if (account.bankName) {
    const branch = account.branchName ? ` สาขา${account.branchName}` : "";
    parts.push(escapeHtml(`ธนาคาร${account.bankName}${branch}`));
  }
  if (account.accountName) {
    parts.push(`ชื่อบัญชี ${escapeHtml(account.accountName)}`);
  }
  if (account.accountNumber) {
    parts.push(`เลขที่บัญชี ${escapeHtml(account.accountNumber)}`);
  }

  return parts.join(" · ");
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
        grid-template-columns: auto 1fr;
        gap: 14px;
        align-items: center;
      }
      .logo-box {
        height: 64px;
        display: flex;
        align-items: center;
      }
      .logo {
        height: 64px;
        width: auto;
        max-width: 120px;
        object-fit: contain;
        display: block;
      }
      .company-name {
        font-size: 16px;
        font-weight: 500;
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
        font-weight: 500;
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
        font-weight: 500;
      }
      .meta-value {
        font-size: 13px;
        font-weight: 500;
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
        font-weight: 500;
      }
      .info-row .value {
        color: #111827;
        font-weight: 500;
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
        font-weight: 500;
      }
      .info-row-emphasis .value {
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.01em;
      }
      .info-section-title {
        font-size: 12px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 8px;
      }
      .meta-revision {
        margin-top: 2px;
        font-size: 11px;
        font-weight: 400;
        color: #6b7280;
      }
      .draft-banner {
        margin: 0 0 12px;
        padding: 8px 12px;
        border: 1px dashed #c4a35a;
        border-radius: 8px;
        background: #fffbeb;
        color: #92400e;
        font-size: 11px;
      }
      .round-heading {
        margin: 12px 0 6px;
        font-size: 12px;
        font-weight: 600;
        color: #374151;
      }
      .round-block:first-child .round-heading {
        margin-top: 0;
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
        font-weight: 500;
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
      .totals-row-separated {
        border-top: 1.2px solid #9ca3af;
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
      .total-line strong { font-weight: 500; color: #111827; }
      .total-line-grand {
        margin-top: 4px;
        padding-top: 8px;
        border-top: 1px solid #d1d5db;
        font-size: 13px;
        font-weight: 500;
      }
      .info-row .value p,
      .remark-box p {
        margin: 0 0 4px;
      }
      .info-row .value p:last-child,
      .remark-box p:last-child {
        margin-bottom: 0;
      }
      .info-row .value ul,
      .info-row .value ol,
      .remark-box ul,
      .remark-box ol {
        margin: 0 0 4px;
        padding-left: 18px;
      }
      .info-row .value h1,
      .remark-box h1 {
        margin: 0 0 6px;
        font-size: 16px;
        font-weight: 700;
        line-height: 1.3;
      }
      .info-row .value h2,
      .remark-box h2 {
        margin: 0 0 6px;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.35;
      }
      .info-row .value ul[data-task],
      .remark-box ul[data-task] {
        list-style: none;
        padding-left: 2px;
      }
      .info-row .value ul[data-task] li,
      .remark-box ul[data-task] li {
        position: relative;
        padding-left: 16px;
      }
      .info-row .value ul[data-task] li::before,
      .remark-box ul[data-task] li::before {
        content: "☐";
        position: absolute;
        left: 0;
      }
      .info-row .value ul[data-task] li[data-checked="true"]::before,
      .remark-box ul[data-task] li[data-checked="true"]::before {
        content: "☑";
      }
      .info-row .value s,
      .info-row .value strike,
      .info-row .value del,
      .remark-box s,
      .remark-box strike,
      .remark-box del {
        text-decoration: line-through;
      }
      .info-row .value pre,
      .remark-box pre {
        margin: 0 0 6px;
        padding: 6px 8px;
        background: #f3f4f6;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
        white-space: pre-wrap;
      }
      .info-row .value code,
      .remark-box code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px;
      }
      .remark-box {
        margin-top: 14px;
        border: 1.2px solid #e5e7eb;
        background: #fcfcfd;
        padding: 12px 14px;
        display: grid;
        grid-template-columns: 110px 1fr;
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
        font-weight: 500;
        margin-bottom: 4px;
      }
      /* สูงคงที่ ไม่ว่าจะมีรูปลายเซ็นหรือไม่ — ให้เส้นเซ็นทุกคอลัมน์ตรงแนวกัน */
      .sig-space {
        height: 34px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        overflow: hidden;
      }
      .sig-image {
        max-height: 34px;
        max-width: 100%;
        object-fit: contain;
      }
      .sig-name {
        font-size: 11px;
        font-weight: 500;
        text-align: center;
        color: #1f2937;
        margin-bottom: 6px;
        min-height: 14px;
      }
      .sig-line {
        border-bottom: 1px dashed #6b7280;
        margin-bottom: 10px;
      }
      .sig-date { font-size: 11px; color: #4b5563; font-weight: 500; }
      .bank-box {
        margin-top: 14px;
        border: 1.2px solid #e5e7eb;
        background: #fcfcfd;
        padding: 10px 14px;
        display: grid;
        grid-template-columns: 90px 1fr;
        gap: 8px;
        font-size: 12px;
      }
      .bank-box strong { font-weight: 500; }
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

/** แคป HTML หน้าเดียว (กว้าง 794px) เป็น PDF A4 — ใช้ร่วมกันทั้งเปิดแท็บและดาวน์โหลด */
async function renderPdfFromHtml(pageId: string, pageHtml: string) {
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

  document.body.removeChild(wrapper);
  return pdf;
}

/**
 * จองแท็บสำหรับเปิด PDF — ต้องเรียก "ทันทีในตัวจัดการคลิก" ก่อน await ใดๆ
 * เพราะการสร้าง PDF หลายหน้าใช้เวลานาน พอเสร็จแล้วค่อย window.open เบราว์เซอร์จะมองว่าไม่ใช่การกดของผู้ใช้แล้วบล็อก popup
 * ถ้าไม่ได้จอง / จองไม่สำเร็จ ฟังก์ชันเปิด PDF จะ window.open เองเหมือนเดิม และถ้าถูกบล็อกจะดาวน์โหลดไฟล์แทน
 */
let reservedPdfWindow: Window | null = null;

export function reservePdfWindow() {
  try {
    reservedPdfWindow = window.open("", "_blank");
    reservedPdfWindow?.document.write(
      "<p style='font-family:sans-serif;padding:24px'>กำลังสร้าง PDF…</p>",
    );
  } catch {
    reservedPdfWindow = null;
  }
}

/** ปิดแท็บที่จองไว้ (เรียกเมื่อสร้าง PDF ไม่สำเร็จ) */
export function releasePdfWindow() {
  try {
    reservedPdfWindow?.close();
  } catch {
    /* ignore */
  }
  reservedPdfWindow = null;
}

function deliverPdf(pdf: jsPDF, filename = "document.pdf") {
  const url = pdf.output("bloburl") as unknown as string;
  const reserved = reservedPdfWindow;
  reservedPdfWindow = null;
  if (reserved && !reserved.closed) {
    reserved.location.href = url;
    return;
  }
  const opened = window.open(url, "_blank");
  if (!opened) {
    // popup ถูกบล็อก → ดาวน์โหลดไฟล์แทน จะได้ไม่เงียบหาย
    pdf.save(filename);
  }
}

export async function openPdfFromHtml(pageId: string, pageHtml: string) {
  const pdf = await renderPdfFromHtml(pageId, pageHtml);
  deliverPdf(pdf);
}

/** บันทึกเป็นไฟล์ .pdf ลงเครื่องโดยตรง (ไม่เปิดแท็บใหม่) */
export async function downloadPdfFromHtml(
  pageId: string,
  pageHtml: string,
  filename: string,
) {
  const pdf = await renderPdfFromHtml(pageId, pageHtml);
  pdf.save(filename);
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
  options?: {
    /** ความกว้าง wrapper — เอกสารที่หน้ากว้างไม่ใช่ 794px ต้องส่งค่าของตัวเอง */
    wrapperWidth?: string;
    /**
     * แนบ `basePdfStyles()` ให้หรือไม่ — เอกสารที่มี `<style>` ของตัวเองต้องส่ง
     * `false` ไม่งั้นคลาสชื่อซ้ำ (`.logo` `.info-card` `.info-grid` `.title`)
     * จะทับกันจนเลย์เอาต์เพี้ยน
     */
    includeBaseStyles?: boolean;
    /**
     * แนวหน้ากระดาษ — ค่าเริ่มต้นแนวตั้ง (ใบอื่นทั้งหมดไม่กระทบ)
     * แนวนอน: หน้าแต่ละหน้าต้องตรึงขนาด 1123×794px ผู้เรียกจัดเอง
     */
    orientation?: "portrait" | "landscape";
  },
) {
  if (pagesHtml.length === 0) {
    throw new Error("PDF has no pages to render");
  }

  const {
    wrapperWidth = "794px",
    includeBaseStyles = true,
    orientation = "portrait",
  } = options ?? {};

  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.width = wrapperWidth;
  wrapper.style.background = "#fff";
  wrapper.innerHTML = `${includeBaseStyles ? basePdfStyles() : ""}${pagesHtml.join("")}`;
  document.body.appendChild(wrapper);

  try {
    await waitForImages(wrapper);

    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: "a4",
      compress: true,
    });
    const pageWidthMm = orientation === "landscape" ? 297 : 210;
    const pageHeightMm = orientation === "landscape" ? 210 : 297;

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
      pdf.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        pageWidthMm,
        pageHeightMm,
      );
    }

    deliverPdf(pdf);
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
  /** โหมด valueColumns — มูลค่าเดิม / ที่ถูกต้อง (null = ไม่มีข้อมูล พิมพ์ "—") */
  originalAmount?: number | null;
  correctAmount?: number | null;
  /** โหมด journalColumns — เลขที่บัญชี / แผนก (ว่างได้) / เดบิต / เครดิต (0 หรือไม่ใส่ = ไม่พิมพ์) · รายละเอียด = itemName */
  accountCode?: string;
  department?: string;
  debit?: number;
  credit?: number;
};

/**
 * ช่องลายเซ็น 1 ช่อง — ส่ง string มาได้เหมือนเดิม (มีแค่หัวข้อ)
 * หรือส่ง object เพื่อใส่ชื่อผู้เซ็นและรูปลายเซ็นที่อัปโหลดไว้
 */
export type SalesSignatureSlot =
  | string
  | {
      title: string;
      name?: string;
      /** ต้องเป็น data URI — ดู lib/user/user-signature.ts */
      signatureDataUrl?: string | null;
    };

export type SalesCommercialPdfInfoRow = {
  label: string;
  value: string;
  full?: boolean;
  emphasis?: boolean;
  /** ค่าเป็น HTML ที่ต้อง sanitize ก่อนใส่ — ค่าเริ่มต้น escape เป็นข้อความ */
  html?: boolean;
};

export type SalesCommercialPdfItemGroup = {
  heading?: string;
  items: SalesLinePdfItem[];
};

export type SalesCommercialPdfTotalsLine = {
  label: string;
  value: number;
  grand?: boolean;
};

export type SalesCommercialPdfColumnLabels = {
  no?: string;
  code?: string;
  name?: string;
  unit?: string;
  qty?: string;
  price?: string;
  disc?: string;
  amount?: string;
  extra?: string;
  /** โหมด valueColumns */
  original?: string;
  correct?: string;
  reduced?: string;
};

export type SalesCommercialPdfData = {
  pageId: string;
  titleTh: string;
  /** ไม่ส่ง = ไม่พิมพ์บรรทัดอังกฤษใต้ชื่อเอกสาร */
  titleEn?: string;
  docNo: string;
  docDate: string;
  /**
   * ช่องที่สามของแถบหัว — ใส่เฉพาะเมื่อเอกสารมีค่านี้อยู่แล้ว
   * เช่น วันครบกำหนด หรือวันหมดอายุ ไม่สร้างฟิลด์ใหม่ในฐานข้อมูล
   */
  metaThird?: { label: string; value: string };
  /** ป้ายใต้เลขที่ เช่น ฉบับแก้ไข วันที่ … */
  revisionLabel?: string;
  draftBanner?: string;
  /** โทนแถบหัวกระดาษ — warn (ค่าเริ่มต้น เหลือง) / success (เขียว) */
  draftBannerTone?: "warn" | "success";
  /**
   * แสตมป์ทแยงมุมบนหน้า (เช่น "จ่ายแล้ว") — ไม่กินเลย์เอาต์
   * ใช้แทนแถบ draftBanner เมื่อต้องการให้ดูเป็นตราประทับ
   */
  statusStamp?: string;
  infoRows: SalesCommercialPdfInfoRow[];
  infoSections?: Array<{
    title?: string;
    /** สองคู่ป้าย-ค่าต่อแถว */
    pairs?: boolean;
    rows: SalesCommercialPdfInfoRow[];
    /** การ์ดกินเต็มความกว้างทั้งแถว (ไม่ต้องแบ่งครึ่งกับการ์ดข้างเคียง) */
    wide?: boolean;
  }>;
  items: SalesLinePdfItem[];
  itemGroups?: SalesCommercialPdfItemGroup[];
  columnLabels?: SalesCommercialPdfColumnLabels;
  withPrices: boolean;
  subtotalAmount?: number;
  discountAmount?: number;
  vatAmount?: number;
  totalAmount?: number;
  totalsLines?: SalesCommercialPdfTotalsLine[];
  remark?: string;
  remarkLabel?: string;
  /** หมายเหตุเป็น HTML (ใบสั่งขาย) — เอกสารอื่นยังเป็นข้อความธรรมดา */
  remarkIsHtml?: boolean;
  signatures?: [SalesSignatureSlot, SalesSignatureSlot, SalesSignatureSlot];
  /** รหัสกับชื่ออยู่คอลัมน์เดียว เรียง ลำดับ ชื่อ จำนวน หน่วย */
  codeWithName?: boolean;
  /** สี่คอลัมน์ ลำดับ รหัส วันที่ ยอด และแสดง totalsLines ได้โดยไม่เปิดตารางราคา */
  lineAmountTable?: boolean;
  /** ก้อนใต้ตาราง ก่อนหมายเหตุ — วัดทั้งก้อนก่อนตัดหน้า */
  afterTableHtml?: string;
  /**
   * ห้าคอลัมน์ ลำดับ รายการ มูลค่าเดิม มูลค่าที่ถูกต้อง มูลค่าที่ลดลง (ใบลดหนี้เจ้าหนี้)
   * ใช้คู่กับ withPrices เพื่อให้ยอดรวมยังแสดง · ไม่มีคอลัมน์รหัส/จำนวน/หน่วย/ราคา
   */
  valueColumns?: boolean;
  /**
   * ตารางบัญชีแบบใบสำคัญ: เลขที่บัญชี | แผนก | รายละเอียด | เดบิต | เครดิต (ใช้ accountCode/department/debit/credit ของ item)
   * แถวท้ายตารางใช้ journalTotals — ตัวอักษรจำนวนเงิน / รวม / ยอดเดบิต / ยอดเครดิต · ไม่ใช้กล่อง totalsLines
   */
  journalColumns?: boolean;
  journalTotals?: { debit: number; credit: number; amountText: string };
};

/* ---------- เอกสารกลุ่มขาย — ใช้ design เดียวกับใบสั่งซื้อ ---------- */

/** A4 ที่ความกว้าง 594px — ต้องตรึงทั้งคู่ ไม่งั้นแคปทีละหน้าแล้วสัดส่วนเพี้ยน */
const SALES_PAGE_WIDTH = 594;
const SALES_PAGE_HEIGHT = 842;
const SALES_PAD_TOP = 34;
const SALES_PAD_BOTTOM = 36;
const SALES_CONTENT_HEIGHT =
  SALES_PAGE_HEIGHT - SALES_PAD_TOP - SALES_PAD_BOTTOM;

/** `.table` กิน margin-top 14px + เส้นขอบบนล่างอีกด้านละ 1px */
const SALES_TABLE_CHROME = 16;

/** เผื่อกันฟอนต์ไทยดันความสูงเกินค่าที่วัดได้เศษหนึ่ง */
const SALES_SAFETY = 8;

/** กันวนไม่รู้จบถ้าคำนวณพลาดจนบล็อกไม่มีวันลงหน้าได้ */
const SALES_MAX_PAGES = 200;

function salesDash(value?: string) {
  const text = value?.trim();
  return text ? text : "—";
}

function salesStyles() {
  return `
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap");

      * { box-sizing: border-box; }

      /*
        ตรึงความสูงตายตัว ไม่ใช่ min-height — ตัวจัดหน้าคำนวณมาแล้วว่าอะไรลงหน้าไหน
        overflow: hidden กันเนื้อหาที่เกินคาดล้นไปปนกับหน้าถัดไปตอนแคปภาพ
      */
      .page {
        width: ${SALES_PAGE_WIDTH}px;
        height: ${SALES_PAGE_HEIGHT}px;
        overflow: hidden;
        background: #fff;
        padding: ${SALES_PAD_TOP}px 23px ${SALES_PAD_BOTTOM}px;
        position: relative;
        color: #263039;
        font-family: "Sarabun", Tahoma, sans-serif;
        display: flex;
        flex-direction: column;
      }

      /* หน้าจำลองสำหรับวัดความสูง — ต้องยืดได้ และห้ามมี margin auto มาดันตำแหน่ง */
      .page.probe {
        height: auto;
        overflow: visible;
      }

      /*
        เอา margin-top: auto ออกเฉพาะตัวที่ใช้มันดันตัวเองลงล่าง
        ห้ามล้าง .doc-foot ตัวธรรมดา ไม่งั้น margin ของมันจะไม่ถูกนับเป็นงบ
        แล้วหน้าที่เนื้อหาพอดี ๆ จะล้นออกไปสิบกว่าพิกเซล
      */
      .page.probe .page-end,
      .page.probe .doc-foot.pinned {
        margin-top: 0;
      }

      /* หมุดวัดตำแหน่ง สูงศูนย์ ไม่รบกวนเลย์เอาต์ */
      .pm {
        display: block;
        height: 0;
        margin: 0;
        padding: 0;
        flex-shrink: 0;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        border-bottom: 1.5px solid #6ba83f;
        padding-bottom: 8px;
        flex-shrink: 0;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .logo {
        height: 46px;
        width: auto;
        max-width: 84px;
        object-fit: contain;
        display: block;
        flex: 0 0 auto;
      }

      .symbol {
        width: 42px;
        height: 42px;
        flex: 0 0 auto;
      }

      .symbol {
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6ba83f;
        font-size: 28px;
        font-weight: 800;
      }

      .company-name {
        font-size: 12px;
        margin: 0 0 2px;
        font-weight: 800;
        color: #333;
        line-height: 1.15;
      }

      .company-address {
        font-size: 8px;
        margin: 0;
        color: #555;
        line-height: 1.4;
      }

      .doc-title {
        text-align: right;
        flex-shrink: 0;
      }

      .doc-title strong {
        display: block;
        font-size: 18px;
        color: #315e24;
        line-height: 1.15;
      }

      .doc-title small {
        display: block;
        color: #7c848b;
        letter-spacing: 0.4px;
        font-size: 8px;
      }

      .doc-meta {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        border: 1px solid #d5dce1;
        border-radius: 5px;
        overflow: hidden;
        margin-top: 10px;
        flex-shrink: 0;
      }

      .doc-meta.cols-3 {
        grid-template-columns: 1.3fr 1fr 1fr;
      }

      .meta-cell {
        padding: 6px 8px;
        border-right: 1px solid #d5dce1;
      }

      .meta-cell:last-child { border-right: 0; }

      .meta-cell .meta-label {
        color: #66727d;
        font-size: 8px;
        display: block;
        margin-bottom: 2px;
      }

      .meta-cell .meta-value {
        font-weight: 700;
        font-size: 10px;
        color: #263039;
      }

      .docrev {
        margin-top: 2px;
        font-size: 7.5px;
        font-weight: 400;
        color: #66727d;
      }

      .cont-strip {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .cont-title {
        font-size: 11px;
        color: #315e24;
        font-weight: 700;
      }

      .cont-no {
        font-size: 8px;
        color: #263039;
        font-weight: 700;
      }

      /* แถบเตือนว่ายังเป็นฉบับร่าง — โทนเดียวกับป้ายเตือนใบอื่น */
      .draft-banner {
        margin-top: 12px;
        border: 1px dashed #e2c98a;
        border-radius: 5px;
        background: #fdf6e8;
        color: #b0821f;
        padding: 7px 10px;
        font-size: 7.5px;
        flex-shrink: 0;
      }

      .draft-banner.success {
        border: 1px solid #a6d6b0;
        background: #eaf7ee;
        color: #2f7d44;
        font-weight: 700;
      }

      /* ตราประทับสถานะ — ทับมุมขวาบน ไม่ดันเลย์เอาต์ */
      .status-stamp {
        position: absolute;
        top: 118px;
        right: 36px;
        z-index: 6;
        pointer-events: none;
        border: 2.5px solid #c62828;
        color: #c62828;
        background: rgba(255, 255, 255, 0.88);
        padding: 6px 18px;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0.08em;
        line-height: 1.1;
        border-radius: 4px;
        transform: rotate(-18deg);
        box-shadow: 0 0 0 1px rgba(198, 40, 40, 0.18);
        white-space: nowrap;
      }

      .info-wrap {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 10px;
        flex-shrink: 0;
      }

      /* มีการ์ดใบเดียวให้กินเต็มความกว้าง ไม่ต้องเหลือช่องว่างข้างขวา */
      .info-wrap.single {
        grid-template-columns: 1fr;
      }

      .info-card {
        border: 1px solid #d5dce1;
        border-radius: 6px;
        padding: 8px 9px;
      }

      .card-title {
        font-size: 10px;
        color: #253626;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: minmax(0, 118px) minmax(0, 1fr);
        column-gap: 8px;
        row-gap: 6px;
        align-items: baseline;
      }

      .info-grid.pairs {
        grid-template-columns: minmax(0, 118px) minmax(0, 1fr) minmax(0, 118px) minmax(0, 1fr);
        column-gap: 10px;
      }

      /*
        label/value เป็นลูกของกริดตรง ๆ — ห้ามห่อ display:contents
        html2canvas 1.4 ไม่วาดลูกของ contents จึงเหลือกรอบการ์ดแต่ค่าในช่องหาย
      */
      .label {
        font-size: 8px;
        color: #66727d;
        line-height: 1.35;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .value {
        font-size: 8.5px;
        color: #263039;
        line-height: 1.35;
        word-break: break-word;
        overflow-wrap: anywhere;
        min-width: 0;
      }

      .label.emphasis,
      .value.emphasis {
        color: #263039;
        font-weight: 700;
      }

      .label.full,
      .value.full {
        grid-column: 1 / -1;
      }

      .table {
        width: 100%;
        margin-top: 14px;
        border: 1px solid #d5dce1;
        border-radius: 5px;
        overflow: hidden;
        flex-shrink: 0;
      }

      .tr {
        display: grid;
        width: 100%;
        align-items: center;
      }

      /* จำนวนคอลัมน์ต่างกันตามชนิดเอกสาร — มีราคา / ไม่มีราคาแต่มีหมายเหตุ / ไม่มีทั้งคู่ */
      .tr.c8 {
        grid-template-columns: 28px 56px 1fr 36px 44px 62px 50px 66px;
      }

      .tr.c6 {
        grid-template-columns: 34px 70px 1fr 50px 56px 80px;
      }

      .tr.c5 {
        grid-template-columns: 34px 80px 1fr 60px 70px;
      }

      .tr.c4 {
        grid-template-columns: 34px 1fr 70px 56px;
      }

      .tr.c4amt {
        grid-template-columns: 34px 1.4fr 110px 90px;
      }

      .tr.c5v {
        grid-template-columns: 34px 1fr 84px 92px 84px;
      }

      /* ตารางบัญชีของใบสำคัญ — เส้นแบ่งคอลัมน์ตามแบบที่ลูกค้าใช้ */
      .tr.c5j {
        grid-template-columns: 92px 44px 1fr 84px 84px;
        align-items: stretch;
      }

      .tr.c5j .cell + .cell {
        border-left: 1px solid #d5dce1;
      }

      .tr.c5j .cell.num {
        text-align: right;
        white-space: nowrap;
      }

      .journal-total {
        display: grid;
        grid-template-columns: 1fr 84px 84px;
        margin-top: 6px;
        border: 1px solid #d5dce1;
        border-radius: 5px;
        font-size: 8px;
        font-weight: 700;
        color: #263039;
        flex-shrink: 0;
      }

      .journal-total > div {
        padding: 8px 7px;
      }

      .journal-total > div + div {
        border-left: 1px solid #d5dce1;
        text-align: right;
        white-space: nowrap;
      }

      .journal-total .jt-text {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .info-card.wide {
        grid-column: 1 / -1;
      }

      .after-table {
        margin-top: 14px;
      }

      .weight-lines {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .weight-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 7.5px;
        color: #343434;
        line-height: 1.35;
      }

      .weight-row .wv {
        text-align: right;
        font-weight: 700;
      }

      .cell-name {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .thead {
        background: #edf0ee;
        min-height: 26px;
        font-size: 7.6px;
        color: #35413b;
        font-weight: 700;
      }

      .tbody {
        min-height: 24px;
        font-size: 8px;
        color: #263039;
        border-top: 1px solid #d5dce1;
      }

      .cell {
        padding: 8px 7px;
      }

      .thead .cell {
        padding: 10px 4px 9px;
        white-space: nowrap;
      }

      .center { text-align: center; }
      .right {
        text-align: right;
        white-space: nowrap;
      }

      /* หัวข้อกลุ่มรายการ เช่น รอบส่งของ */
      .group-heading {
        margin-top: 14px;
        font-size: 8.5px;
        font-weight: 700;
        color: #343434;
        flex-shrink: 0;
      }

      /* ตารางที่ตามหลังหัวข้อกลุ่มไม่ต้องเว้นซ้ำ */
      .group-heading + .table {
        margin-top: 6px;
      }

      .totals {
        width: 229px;
        margin-left: auto;
        margin-top: 20px;
        border: 1px solid #d5dce1;
        border-radius: 5px;
        padding: 10px 8px 9px;
        flex-shrink: 0;
      }

      .tot-row {
        display: grid;
        grid-template-columns: 1fr 78px;
        min-height: 18px;
        align-items: center;
        font-size: 7.5px;
        line-height: 1;
      }

      .tot-row .k,
      .tot-row .v {
        display: flex;
        align-items: center;
        line-height: 1;
      }

      .tot-row .k { color: #343434; }
      .tot-row .v {
        justify-content: flex-end;
        text-align: right;
        color: #7A7A7A;
        font-weight: 700;
      }

      .grand {
        margin: 4px -4px -2px;
        background: #f1f7ed;
        color: #315e24;
        border-radius: 4px;
        padding: 5px 4px;
        font-size: 10px;
        font-weight: 800;
      }

      .grand .k,
      .grand .v {
        color: #315e24;
        font-weight: 800;
        transform: none;
      }

      .note-rule {
        height: 1px;
        background: #D8DCE0;
        margin: 14px 0;
        flex-shrink: 0;
      }

      .note-title {
        font-size: 7.5px;
        color: #343434;
        margin-bottom: 3px;
        flex-shrink: 0;
      }

      /* ไม่ตัดข้อความทิ้ง — ยาวเกินหน้าให้ตัวจัดหน้าหั่นไหลไปหน้าถัดไปแทน */
      .note-value {
        font-size: 8px;
        color: #7A7A7A;
        line-height: 1.35;
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
        flex-shrink: 0;
      }

      /*
        หมายเหตุที่เป็น rich text (ใบสั่งขาย / ใบเสนอราคา) — ต้องคงรูปแบบที่ผู้ใช้
        จัดไว้ ทั้งย่อหน้า หัวข้อ รายการ และ checkbox ไม่งั้นเนื้อหากลายเป็นข้อความก้อนเดียว
      */
      .note-html {
        font-size: 8px;
        color: #7A7A7A;
        line-height: 1.4;
        word-break: break-word;
        overflow-wrap: anywhere;
        flex-shrink: 0;
      }

      .note-html p { margin: 0 0 3px; }
      .note-html p:last-child { margin-bottom: 0; }

      .note-html ul,
      .note-html ol {
        margin: 0 0 3px;
        padding-left: 13px;
      }

      .note-html h1 {
        margin: 0 0 4px;
        font-size: 11px;
        font-weight: 700;
        color: #343434;
        line-height: 1.3;
      }

      .note-html h2 {
        margin: 0 0 4px;
        font-size: 9.5px;
        font-weight: 700;
        color: #343434;
        line-height: 1.35;
      }

      .note-html ul[data-task] {
        list-style: none;
        padding-left: 2px;
      }

      .note-html ul[data-task] li {
        position: relative;
        padding-left: 12px;
      }

      .note-html ul[data-task] li::before {
        content: "☐";
        position: absolute;
        left: 0;
      }

      .note-html ul[data-task] li[data-checked="true"]::before {
        content: "☑";
      }

      .note-html s,
      .note-html strike,
      .note-html del {
        text-decoration: line-through;
      }

      .note-html pre {
        margin: 0 0 4px;
        padding: 5px 6px;
        background: #f4f4f3;
        border-radius: 4px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 7.5px;
        white-space: pre-wrap;
      }

      .note-html code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 7.5px;
      }

      /* บัญชีธนาคารหลัก — เอกสารกลุ่มขายเท่านั้น */
      .bank-box {
        margin-top: 12px;
        border: 1px solid #d5dce1;
        border-radius: 5px;
        padding: 8px 10px;
        display: grid;
        grid-template-columns: 60px 1fr;
        gap: 8px;
        font-size: 7.5px;
        color: #7A7A7A;
        flex-shrink: 0;
      }

      .bank-box strong {
        color: #343434;
        font-weight: 700;
      }

      .page-end {
        margin-top: auto;
        flex-shrink: 0;
      }

      .signatures {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-top: 18px;
        text-align: center;
      }

      .sig {
        text-align: center;
        color: #263039;
        font-size: 8px;
      }

      .sig > div:first-child {
        font-weight: 700;
      }

      /*
        สูงคงที่ไม่ว่าจะมีรูปลายเซ็นหรือไม่ — ให้เส้นเซ็นทุกช่องตรงแนวกัน
        (ใบเสนอราคา / ใบสั่งขาย / ใบแจ้งหนี้ แนบรูปลายเซ็นผู้จัดทำมาจริง)
      */
      .sig .space {
        height: 26px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        overflow: hidden;
        margin-top: 6px;
      }

      .sig .space img {
        max-height: 26px;
        max-width: 100%;
        object-fit: contain;
      }

      .sig .line {
        border-bottom: 1px solid #93999e;
        height: 0;
        margin: 0 6px 4px;
      }

      .sig .name {
        min-height: 9px;
        color: #343434;
        margin-bottom: 4px;
      }

      .sig .date {
        margin-top: 3px;
        color: #66727d;
        font-size: 7.5px;
      }

      .doc-foot {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-top: 10px;
        padding-top: 5px;
        border-top: 1px solid #d5dce1;
        font-size: 7.5px;
        color: #66727d;
        flex-shrink: 0;
      }

      .doc-foot.pinned {
        margin-top: auto;
      }
    </style>
  `;
}

type SalesParts = {
  head: string;
  first: string;
  cont: string;
  thead: string;
  /** หัวข้อกลุ่มกับแถวเรียงตามลำดับที่ต้องพิมพ์ */
  flow: Array<{ kind: "heading" | "row"; html: string }>;
  totals: string;
  afterTable: string;
  noteHead: string;
  /** ชิ้นหมายเหตุ — ข้อความธรรมดาแตกตามบรรทัด, rich text แตกตาม element ชั้นบน */
  noteChunks: string[];
  /** หมายเหตุเป็น HTML หรือไม่ — ตัวข้อความธรรมดาเท่านั้นที่หั่นกลางชิ้นได้ */
  noteIsHtml: boolean;
  noteTexts: string[];
  bank: string;
  pageEnd: string;
};

/**
 * แตกหมายเหตุ rich text ตาม element ชั้นบนสุด
 *
 * หั่นกลาง HTML ไม่ได้เหมือนข้อความธรรมดา จึงตัดตามขอบ element แทน
 * รายการยาว ๆ (`ul`/`ol`) แตกต่อเป็นรายการย่อยทีละ `li` เพราะเป็นเคสที่ยาวเกินหน้าจริง
 */
function splitHtmlChunks(html: string): string[] {
  const holder = document.createElement("div");
  holder.innerHTML = html;

  const chunks: string[] = [];
  for (const node of Array.from(holder.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text.trim()) chunks.push(`<p>${escapeHtml(text)}</p>`);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if ((tag === "ul" || tag === "ol") && el.children.length > 1) {
      for (const li of Array.from(el.children)) {
        const clone = el.cloneNode(false) as HTMLElement;
        clone.appendChild(li.cloneNode(true));
        chunks.push(clone.outerHTML);
      }
      continue;
    }
    chunks.push(el.outerHTML);
  }

  return chunks.length > 0 ? chunks : [`<p>${escapeHtml(salesDash(""))}</p>`];
}

/** แตกหมายเหตุตามการขึ้นบรรทัดของผู้ใช้ — บรรทัดว่างยังนับเป็นบรรทัดว่างจริง */
function splitSalesParagraphs(remark: string) {
  return remark.replace(/\r\n?/g, "\n").split("\n");
}

function salesNoteChunkHtml(content: string, isHtml: boolean) {
  return isHtml
    ? `<div class="note-html">${content}</div>`
    : `<div class="note-value">${escapeHtml(content)}</div>`;
}

/**
 * หาส่วนหน้าของข้อความที่ยาวที่สุดที่ยังสูงไม่เกินงบ
 *
 * ตัดตรงช่องว่างถ้ามีอยู่ไม่ไกลจากจุดตัด ไม่งั้นตัดกลางคำ — ภาษาไทยไม่เว้นวรรค
 * ระหว่างคำอยู่แล้ว การตัดตามตัวอักษรจึงเป็นทางปกติ ไม่ใช่ทางสำรอง
 */
function salesFitTextChunk(
  scratch: HTMLElement,
  text: string,
  budget: number,
): [chunk: string, rest: string] {
  const measure = (value: string) => {
    scratch.textContent = value;
    return scratch.getBoundingClientRect().height;
  };

  if (measure(text) <= budget) {
    return [text, ""];
  }

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(text.slice(0, mid)) <= budget) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }

  if (lo <= 0) return ["", text];

  let cut = lo;
  const space = text.lastIndexOf(" ", lo);
  if (space > lo * 0.5) cut = space;

  const chunk = text.slice(0, cut);
  if (!chunk.trim()) return ["", text];
  return [chunk, text.slice(cut).replace(/^ +/, "")];
}

function salesNameHtml(name: string) {
  return escapeHtml(name).replaceAll("\n", "<br>");
}

function buildSalesParts(data: SalesCommercialPdfData): SalesParts {
  const priceCols = data.withPrices;
  const lineAmount = Boolean(data.lineAmountTable) && !priceCols;
  const labels: Required<SalesCommercialPdfColumnLabels> = {
    no: data.columnLabels?.no ?? "#",
    code: data.columnLabels?.code ?? "รหัส",
    name: data.columnLabels?.name ?? "รายการ",
    unit: data.columnLabels?.unit ?? "หน่วย",
    qty: data.columnLabels?.qty ?? "จำนวน",
    price: data.columnLabels?.price ?? "ราคา",
    disc: data.columnLabels?.disc ?? "ส่วนลด",
    amount: data.columnLabels?.amount ?? "จำนวนเงิน",
    extra: data.columnLabels?.extra ?? "หมายเหตุ",
    original: data.columnLabels?.original ?? "มูลค่าเดิม",
    correct: data.columnLabels?.correct ?? "มูลค่าที่ถูกต้อง",
    reduced: data.columnLabels?.reduced ?? "มูลค่าที่ลดลง",
  };
  const valueCols = Boolean(data.valueColumns) && priceCols;
  const journalCols = Boolean(data.journalColumns);

  const groups: SalesCommercialPdfItemGroup[] =
    data.itemGroups && data.itemGroups.length > 0
      ? data.itemGroups
      : [{ items: data.items }];
  const hasExtra = groups.some((group) =>
    group.items.some((item) => item.extra != null),
  );
  const codeWithName =
    Boolean(data.codeWithName) && !priceCols && !lineAmount && !hasExtra;
  const colClass = journalCols
    ? "c5j"
    : valueCols
    ? "c5v"
    : priceCols
    ? "c8"
    : lineAmount
      ? "c4amt"
      : hasExtra
        ? "c6"
        : codeWithName
          ? "c4"
          : "c5";

  const thead = journalCols
    ? `
        <div class="tr thead ${colClass}">
          <div class="cell center">เลขที่บัญชี</div>
          <div class="cell center">แผนก</div>
          <div class="cell center">รายละเอียด</div>
          <div class="cell num">เดบิต</div>
          <div class="cell num">เครดิต</div>
        </div>`
    : valueCols
    ? `
        <div class="tr thead ${colClass}">
          <div class="cell center">${escapeHtml(labels.no)}</div>
          <div class="cell cell-name">${escapeHtml(labels.name)}</div>
          <div class="cell right">${escapeHtml(labels.original)}</div>
          <div class="cell right">${escapeHtml(labels.correct)}</div>
          <div class="cell right">${escapeHtml(labels.reduced)}</div>
        </div>`
    : priceCols
    ? `
        <div class="tr thead ${colClass}">
          <div class="cell center">${escapeHtml(labels.no)}</div>
          <div class="cell center">${escapeHtml(labels.code)}</div>
          <div class="cell cell-name">${escapeHtml(labels.name)}</div>
          <div class="cell center">${escapeHtml(labels.unit)}</div>
          <div class="cell right">${escapeHtml(labels.qty)}</div>
          <div class="cell right">${escapeHtml(labels.price)}</div>
          <div class="cell right">${escapeHtml(labels.disc)}</div>
          <div class="cell right">${escapeHtml(labels.amount)}</div>
        </div>`
    : lineAmount
      ? `
        <div class="tr thead ${colClass}">
          <div class="cell center">${escapeHtml(labels.no)}</div>
          <div class="cell center">${escapeHtml(labels.code)}</div>
          <div class="cell center">${escapeHtml(labels.name)}</div>
          <div class="cell right">${escapeHtml(labels.amount)}</div>
        </div>`
    : hasExtra
      ? `
        <div class="tr thead ${colClass}">
          <div class="cell center">${escapeHtml(labels.no)}</div>
          <div class="cell center">${escapeHtml(labels.code)}</div>
          <div class="cell cell-name">${escapeHtml(labels.name)}</div>
          <div class="cell center">${escapeHtml(labels.unit)}</div>
          <div class="cell right">${escapeHtml(labels.qty)}</div>
          <div class="cell center">${escapeHtml(labels.extra)}</div>
        </div>`
      : codeWithName
        ? `
        <div class="tr thead ${colClass}">
          <div class="cell center">${escapeHtml(labels.no)}</div>
          <div class="cell cell-name">${escapeHtml(labels.name)}</div>
          <div class="cell right">${escapeHtml(labels.qty)}</div>
          <div class="cell center">${escapeHtml(labels.unit)}</div>
        </div>`
      : `
        <div class="tr thead ${colClass}">
          <div class="cell center">${escapeHtml(labels.no)}</div>
          <div class="cell center">${escapeHtml(labels.code)}</div>
          <div class="cell cell-name">${escapeHtml(labels.name)}</div>
          <div class="cell center">${escapeHtml(labels.unit)}</div>
          <div class="cell right">${escapeHtml(labels.qty)}</div>
        </div>`;

  const moneyOrDash = (value?: number | null) =>
    value == null ? "—" : formatMoney(value);
  const moneyOrBlank = (value?: number) =>
    value != null && value > 0 ? formatMoney(value) : "";
  const rowHtml = (item: SalesLinePdfItem) =>
    journalCols
      ? `
        <div class="tr tbody ${colClass}">
          <div class="cell">${escapeHtml(item.accountCode ?? "")}</div>
          <div class="cell">${escapeHtml(item.department ?? "")}</div>
          <div class="cell cell-name">${salesNameHtml(item.itemName)}</div>
          <div class="cell num">${moneyOrBlank(item.debit)}</div>
          <div class="cell num">${moneyOrBlank(item.credit)}</div>
        </div>`
      : valueCols
      ? `
        <div class="tr tbody ${colClass}">
          <div class="cell center">${item.no}</div>
          <div class="cell cell-name">${salesNameHtml(item.itemName)}</div>
          <div class="cell right">${moneyOrDash(item.originalAmount)}</div>
          <div class="cell right">${moneyOrDash(item.correctAmount)}</div>
          <div class="cell right">${formatMoney(item.amount ?? 0)}</div>
        </div>`
      : priceCols
      ? `
        <div class="tr tbody ${colClass}">
          <div class="cell center">${item.no}</div>
          <div class="cell center">${escapeHtml(item.itemCode)}</div>
          <div class="cell cell-name">${salesNameHtml(item.itemName)}</div>
          <div class="cell center">${escapeHtml(item.unit)}</div>
          <div class="cell right">${formatQty(item.qty)}</div>
          <div class="cell right">${formatMoney(item.unitPrice ?? 0)}</div>
          <div class="cell right">${formatMoney(item.discountAmount ?? 0)}</div>
          <div class="cell right">${formatMoney(item.amount ?? 0)}</div>
        </div>`
      : lineAmount
        ? `
        <div class="tr tbody ${colClass}">
          <div class="cell center">${item.no}</div>
          <div class="cell center">${escapeHtml(item.itemCode)}</div>
          <div class="cell center">${escapeHtml(salesDash(item.itemName))}</div>
          <div class="cell right">${formatMoney(item.amount ?? 0)}</div>
        </div>`
      : codeWithName
        ? `
        <div class="tr tbody ${colClass}">
          <div class="cell center">${item.no}</div>
          <div class="cell cell-name">${salesNameHtml(item.itemName)}</div>
          <div class="cell right">${formatQty(item.qty)}</div>
          <div class="cell center">${escapeHtml(item.unit)}</div>
        </div>`
      : `
        <div class="tr tbody ${colClass}">
          <div class="cell center">${item.no}</div>
          <div class="cell center">${escapeHtml(item.itemCode)}</div>
          <div class="cell cell-name">${salesNameHtml(item.itemName)}</div>
          <div class="cell center">${escapeHtml(item.unit)}</div>
          <div class="cell right">${formatQty(item.qty)}</div>
          ${hasExtra ? `<div class="cell center">${escapeHtml(item.extra ?? "—")}</div>` : ""}
        </div>`;

  const flow: SalesParts["flow"] = [];
  for (const group of groups) {
    if (group.heading) {
      flow.push({
        kind: "heading",
        html: `<div class="group-heading">${escapeHtml(group.heading)}</div>`,
      });
    }
    for (const item of group.items) {
      flow.push({ kind: "row", html: rowHtml(item) });
    }
  }

  const renderInfoRows = (rows: SalesCommercialPdfInfoRow[]) =>
    rows
      .map((row) => {
        const extras = [
          row.emphasis ? "emphasis" : "",
          row.full ? "full" : "",
        ]
          .filter(Boolean)
          .map((token) => ` ${token}`)
          .join("");
        const valueHtml = row.html
          ? sanitizeDocumentHtml(row.value) || "—"
          : escapeHtml(salesDash(row.value));
        return `
            <div class="label${extras}">${escapeHtml(row.label)}</div>
            <div class="value${extras}">${valueHtml}</div>`;
      })
      .join("");

  const infoSections =
    data.infoSections && data.infoSections.length > 0
      ? data.infoSections
      : [{ rows: data.infoRows }];
  const infoCardsHtml = infoSections
    .map(
      (section) => `
        <section class="info-card${section.wide ? " wide" : ""}">
          ${section.title ? `<div class="card-title">${escapeHtml(section.title)}</div>` : ""}
          <div class="info-grid${section.pairs ? " pairs" : ""}">${renderInfoRows(section.rows)}</div>
        </section>`,
    )
    .join("");

  const logo = companyLogoUrl();
  const head = `
      <header class="header">
        <div class="brand">
          ${
            logo
              ? `<img src="${logo}" class="logo" alt="" crossorigin="anonymous" />`
              : `<div class="symbol" aria-hidden="true">◈</div>`
          }
          <div>
            <div class="company">${companyIdentityLinesHtml({
              phoneLabel: "โทร.",
              taxIdStyle: "grouped",
              separator: " • ",
            })}
            </div>
          </div>
        </div>
        <div class="doc-title">
          <strong>${escapeHtml(data.titleTh)}</strong>
          ${data.titleEn ? `<small>${escapeHtml(data.titleEn)}</small>` : ""}
        </div>
      </header>`;

  const metaClass = data.metaThird ? "doc-meta cols-3" : "doc-meta";
  const first = `
      <div class="${metaClass}">
        <div class="meta-cell">
          <span class="meta-label">เลขที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(data.docNo)}</span>
          ${data.revisionLabel ? `<div class="docrev">${escapeHtml(data.revisionLabel)}</div>` : ""}
        </div>
        <div class="meta-cell">
          <span class="meta-label">วันที่เอกสาร</span>
          <span class="meta-value">${escapeHtml(salesDash(data.docDate))}</span>
        </div>
        ${
          data.metaThird
            ? `<div class="meta-cell">
          <span class="meta-label">${escapeHtml(data.metaThird.label)}</span>
          <span class="meta-value">${escapeHtml(salesDash(data.metaThird.value))}</span>
        </div>`
            : ""
        }
      </div>
      ${data.draftBanner ? `<div class="draft-banner${data.draftBannerTone === "success" ? " success" : ""}">${escapeHtml(data.draftBanner)}</div>` : ""}
      <div class="info-wrap${infoSections.length === 1 ? " single" : ""}">
        ${infoCardsHtml}
      </div>`;

  const cont = `
      <div class="cont-strip">
        <span class="cont-title">${escapeHtml(data.titleTh)}${
          data.titleEn ? ` / ${escapeHtml(data.titleEn)}` : ""
        }</span>
        <span class="cont-no">เลขที่ ${escapeHtml(data.docNo)} · ${escapeHtml(salesDash(data.docDate))}</span>
      </div>`;

  const defaultTotals: SalesCommercialPdfTotalsLine[] = [
    { label: "ยอดรวม", value: data.subtotalAmount ?? 0 },
    { label: "ส่วนลด", value: data.discountAmount ?? 0 },
    { label: "ภาษีมูลค่าเพิ่ม", value: data.vatAmount ?? 0 },
    { label: "ยอดสุทธิ", value: data.totalAmount ?? 0, grand: true },
  ];
  const totalsLines = data.totalsLines ?? defaultTotals;
  const totals = journalCols && data.journalTotals
    ? `
      <div class="journal-total">
        <div class="jt-text"><span>${escapeHtml(data.journalTotals.amountText)}</span><span>รวม</span></div>
        <div>${formatMoney(data.journalTotals.debit)}</div>
        <div>${formatMoney(data.journalTotals.credit)}</div>
      </div>`
    : priceCols || lineAmount
    ? `
      <div class="totals">
        ${totalsLines
          .map(
            (line) => `
        <div class="tot-row${line.grand ? " grand" : ""}">
          <div class="k">${escapeHtml(line.label)}:</div>
          <div class="v">${formatMoney(line.value)}</div>
        </div>`,
          )
          .join("")}
      </div>`
    : "";

  const noteIsHtml = Boolean(data.remarkIsHtml);
  const remarkBody = noteIsHtml ? sanitizeDocumentHtml(data.remark) : "";
  const noteTexts = noteIsHtml
    ? splitHtmlChunks(remarkBody)
    : splitSalesParagraphs(salesDash(data.remark));
  const noteChunks = noteTexts.map((text) =>
    salesNoteChunkHtml(text, noteIsHtml),
  );

  const noteHead = `
      <div class="note-rule"></div>
      <div class="note-title">${escapeHtml(data.remarkLabel || "หมายเหตุ")} :</div>`;

  // บัญชีธนาคารหลักจาก master ข้อมูลบริษัท — เอกสารกลุ่มขายเท่านั้น
  const bankLine = companyBankLineHtml();
  const bank = bankLine
    ? `<div class="bank-box"><strong>ชำระเงินที่</strong><div>${bankLine}</div></div>`
    : "";

  const sigs: SalesSignatureSlot[] = data.signatures ?? [
    "ผู้จัดทำ",
    "ผู้ตรวจสอบ",
    "ผู้อนุมัติ",
  ];
  const pageEnd = `
      <div class="page-end">
        <div class="signatures">
          ${sigs
            .map((slot) => {
              const { title, name, signatureDataUrl } =
                typeof slot === "string" ? { title: slot } : slot;
              return `
          <div class="sig">
            <div>${escapeHtml(title)}</div>
            <div class="space">${
              signatureDataUrl ? `<img src="${signatureDataUrl}" alt="" />` : ""
            }</div>
            <div class="line"></div>
            <div class="name">${name ? escapeHtml(name) : ""}</div>
            <div class="date">วันที่ ___/___/___</div>
          </div>`;
            })
            .join("")}
        </div>
      </div>`;

  return {
    head,
    first,
    cont,
    thead,
    flow,
    totals,
    afterTable: data.afterTableHtml ?? "",
    noteHead,
    noteChunks,
    noteIsHtml,
    noteTexts,
    bank,
    pageEnd,
  };
}

/**
 * แถบล่างสุดของทุกหน้า
 *
 * `pinned` = หน้านี้ไม่มีบล็อกลายเซ็น จึงต้องดันตัวเองลงล่างด้วย `margin-top: auto`
 * หน้าที่มีลายเซ็นห้าม pinned เพราะ auto สองตัวจะแบ่งที่ว่างกันจนเกิดช่องโหว่กลางหน้า
 */
function salesFootBarHtml(
  pageIndex: number,
  pageCount: number,
  pinned: boolean,
) {
  return `
      <div class="doc-foot${pinned ? " pinned" : ""}">
        <span>เอกสารออกจากระบบ ERP · ${escapeHtml(companyBrandName())}</span>
        <span>หน้า ${pageIndex + 1} / ${pageCount}</span>
      </div>`;
}

type SalesMetrics = {
  head: number;
  first: number;
  cont: number;
  thead: number;
  flow: number[];
  totals: number;
  afterTable: number;
  noteHead: number;
  notes: number[];
  bank: number;
  pageEnd: number;
  foot: number;
  noteLine: number;
};

type SalesProbe = {
  root: HTMLElement;
  scratch: HTMLElement;
  metrics: SalesMetrics;
};

/**
 * วัดทุกก้อนในรอบเดียว
 *
 * ใช้หมุดสูงศูนย์คั่นระหว่างก้อนแล้วอ่านส่วนต่างของ `offsetTop` — ได้ความสูงรวม
 * margin มาด้วย ซึ่ง `getBoundingClientRect()` ให้ไม่ได้
 */
function buildSalesProbe(parts: SalesParts): SalesProbe {
  const root = document.createElement("div");
  root.style.position = "fixed";
  root.style.left = "-99999px";
  root.style.top = "0";
  root.style.width = `${SALES_PAGE_WIDTH}px`;
  root.style.background = "#fff";

  const mark = (id: number) => `<span class="pm" data-pm="${id}"></span>`;

  root.innerHTML = `
    ${salesStyles()}
    <div class="page probe" id="sales-probe">
      ${mark(0)}${parts.head}
      ${mark(1)}${parts.first}
      ${mark(2)}${parts.cont}
      ${mark(3)}${parts.totals}
      ${mark(4)}${parts.afterTable}
      ${mark(5)}${parts.noteHead}
      ${mark(6)}${parts.bank}
      ${mark(7)}${parts.pageEnd}
      ${mark(8)}${salesFootBarHtml(0, 1, false)}
      ${mark(9)}
      <div class="table" id="sales-probe-table">${parts.thead}</div>
      <div id="sales-probe-flow">
        ${parts.flow
          .map(
            (entry) =>
              `<div class="${entry.kind === "row" ? "table" : ""}" data-k="${entry.kind}">${entry.html}</div>`,
          )
          .join("")}
      </div>
      <div id="sales-probe-notes">${parts.noteChunks.join("")}</div>
      <div class="note-value" id="sales-probe-scratch"></div>
    </div>
  `;

  document.body.appendChild(root);

  const marks = Array.from(root.querySelectorAll<HTMLElement>(".pm")).sort(
    (a, b) => Number(a.dataset.pm) - Number(b.dataset.pm),
  );
  const span = (from: number, to: number) =>
    marks[to].offsetTop - marks[from].offsetTop;

  const height = (el: Element) => el.getBoundingClientRect().height;
  const table = root.querySelector<HTMLElement>("#sales-probe-table")!;
  const flowHost = root.querySelector<HTMLElement>("#sales-probe-flow")!;
  const notes = root.querySelector<HTMLElement>("#sales-probe-notes")!;
  const scratch = root.querySelector<HTMLElement>("#sales-probe-scratch")!;

  scratch.textContent = "หมายเหตุ";
  const noteLine = height(scratch);
  scratch.textContent = "";

  // แถวอยู่ใน .table จำลองจึงติดกรอบมาด้วย หักออกให้เหลือความสูงแถวจริง
  const flow = Array.from(flowHost.children).map((child, index) => {
    const raw = height(child);
    return parts.flow[index].kind === "row" ? raw - 2 : raw;
  });

  return {
    root,
    scratch,
    metrics: {
      head: span(0, 1),
      first: span(1, 2),
      cont: span(2, 3),
      totals: span(3, 4),
      afterTable: span(4, 5),
      noteHead: span(5, 6),
      bank: span(6, 7),
      pageEnd: span(7, 8),
      foot: span(8, 9),
      thead: height(table.querySelector(".tr.thead")!),
      flow,
      notes: Array.from(notes.children).map(height),
      noteLine,
    },
  };
}

type SalesPageDraft = {
  index: number;
  used: number;
  /** ชิ้นส่วนพื้นที่ตาราง เรียงตามลำดับ (หัวข้อกลุ่ม / ตาราง) */
  body: string[];
  tail: string[];
  openTable: boolean;
  hasPageEnd: boolean;
};

function buildSalesPages(
  data: SalesCommercialPdfData,
  parts: SalesParts,
  probe: SalesProbe,
): string[] {
  const m = probe.metrics;
  const pages: SalesPageDraft[] = [];

  const newPage = () => {
    const page: SalesPageDraft = {
      index: pages.length,
      used: 0,
      body: [],
      tail: [],
      openTable: false,
      hasPageEnd: false,
    };
    pages.push(page);
    return page;
  };

  let page = newPage();

  const capacity = (p: SalesPageDraft) =>
    SALES_CONTENT_HEIGHT -
    m.head -
    m.foot -
    (p.index === 0 ? m.first : m.cont) -
    SALES_SAFETY;

  const free = () => capacity(page) - page.used;

  const nextPage = () => {
    if (pages.length >= SALES_MAX_PAGES) {
      throw new Error(
        `${data.titleTh} ${data.docNo}: จัดหน้าเกิน ${SALES_MAX_PAGES} หน้า — เนื้อหายาวผิดปกติ`,
      );
    }
    page = newPage();
  };

  /** เปิดตารางใหม่บนหน้าปัจจุบัน พร้อมหัวตาราง */
  const openTable = () => {
    page.body.push(`<div class="table">${parts.thead}`);
    page.used += m.thead + SALES_TABLE_CHROME;
    page.openTable = true;
  };

  const closeTable = () => {
    if (page.openTable) {
      page.body.push("</div>");
      page.openTable = false;
    }
  };

  // 1) หัวข้อกลุ่ม + แถวรายการ — ตัดได้ระหว่างแถวเท่านั้น หัวตารางซ้ำทุกหน้า
  for (let i = 0; i < parts.flow.length; i += 1) {
    const entry = parts.flow[i];
    const h = m.flow[i] ?? 0;

    if (entry.kind === "heading") {
      // หัวข้อกลุ่มห้ามตกค้างท้ายหน้าโดยไม่มีแถวตามมา
      const firstRow = m.flow[i + 1] ?? 0;
      if (page.used > 0 && h + m.thead + SALES_TABLE_CHROME + firstRow > free()) {
        closeTable();
        nextPage();
      }
      closeTable();
      page.body.push(entry.html);
      page.used += h;
      continue;
    }

    const tableCost = page.openTable ? 0 : m.thead + SALES_TABLE_CHROME;
    if (page.used > 0 && tableCost + h > free()) {
      closeTable();
      nextPage();
    }
    if (!page.openTable) openTable();
    page.body.push(entry.html);
    page.used += h;
  }
  closeTable();

  // 2) ยอดรวม — ยกทั้งก้อน ห้ามตัดครึ่ง (เอกสารที่ไม่มีราคาไม่มีบล็อกนี้)
  if (parts.totals) {
    if (page.used > 0 && m.totals > free()) nextPage();
    page.tail.push(parts.totals);
    page.used += m.totals;
  }

  if (parts.afterTable) {
    if (page.used > 0 && m.afterTable > free()) nextPage();
    page.tail.push(parts.afterTable);
    page.used += m.afterTable;
  }

  // 3) หมายเหตุ — หัวข้อต้องมีอย่างน้อยหนึ่งบรรทัดตามหลัง ไม่งั้นยกไปหน้าใหม่
  if (page.used > 0 && m.noteHead + m.noteLine > free()) nextPage();
  page.tail.push(parts.noteHead);
  page.used += m.noteHead;

  for (let i = 0; i < parts.noteTexts.length; i += 1) {
    const chunkHeight = m.notes[i] ?? 0;

    // ชิ้น HTML หั่นกลางไม่ได้ ยกทั้งก้อน
    if (parts.noteIsHtml) {
      if (page.used > 0 && chunkHeight > free()) nextPage();
      page.tail.push(parts.noteChunks[i]);
      page.used += chunkHeight;
      continue;
    }

    let rest = parts.noteTexts[i];
    let restHeight = chunkHeight;

    // บรรทัดว่างที่ผู้ใช้เคาะไว้ยังต้องกินที่หนึ่งบรรทัด
    if (rest === "") {
      if (page.used > 0 && restHeight > free()) nextPage();
      page.tail.push(salesNoteChunkHtml("", false));
      page.used += restHeight;
      continue;
    }

    while (rest !== "") {
      if (restHeight <= free()) {
        page.tail.push(salesNoteChunkHtml(rest, false));
        page.used += restHeight;
        break;
      }

      const [chunk, remainder] = salesFitTextChunk(probe.scratch, rest, free());

      if (chunk === "") {
        // หน้าเปล่ายังใส่ไม่ลง = คำนวณเพี้ยน ใส่ทั้งก้อนดีกว่าวนไม่รู้จบ
        if (page.used === 0) {
          page.tail.push(salesNoteChunkHtml(rest, false));
          page.used += restHeight;
          break;
        }
        nextPage();
        continue;
      }

      page.tail.push(salesNoteChunkHtml(chunk, false));
      page.used = capacity(page);
      rest = remainder;
      if (rest === "") break;

      nextPage();
      probe.scratch.textContent = rest;
      restHeight = probe.scratch.getBoundingClientRect().height;
    }
  }

  // 4) บัญชีธนาคาร
  if (parts.bank) {
    if (page.used > 0 && m.bank > free()) nextPage();
    page.tail.push(parts.bank);
    page.used += m.bank;
  }

  // 5) ลายเซ็น — ก้อนเดียวจบ อยู่หน้าสุดท้ายเสมอ
  if (page.used > 0 && m.pageEnd > free()) nextPage();
  page.tail.push(parts.pageEnd);
  page.hasPageEnd = true;

  const pageCount = pages.length;

  const stamp = data.statusStamp
    ? `<div class="status-stamp" aria-hidden="true">${escapeHtml(data.statusStamp)}</div>`
    : "";

  return pages.map((draft) => {
    const body = `
    <div id="${data.pageId}-${draft.index}" class="page">
      ${stamp}
      ${parts.head}
      ${draft.index === 0 ? parts.first : parts.cont}
      ${draft.body.join("")}
      ${draft.tail.join("")}
      ${salesFootBarHtml(draft.index, pageCount, !draft.hasPageEnd)}
    </div>`;

    // สไตล์แนบไปกับหน้าแรก ทุกหน้าอยู่ wrapper เดียวกันจึงใช้ร่วมกันได้
    return draft.index === 0 ? `${salesStyles()}${body}` : body;
  });
}

async function waitForSarabun() {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, 2500);
  });
  const loaded = Promise.all([
    document.fonts.load('400 12px "Sarabun"'),
    document.fonts.load('700 12px "Sarabun"'),
  ]).then(() => undefined);
  await Promise.race([loaded, timeout]);
}

/** ประกอบหน้าทั้งหมด — แยกออกมาเพื่อเปิดดูใน harness ได้โดยไม่ต้องสร้าง PDF */
export async function buildSalesCommercialPagesHtml(
  data: SalesCommercialPdfData,
) {
  // ต้องรอฟอนต์ก่อนวัด — Sarabun สูงกว่า fallback ถ้าวัดก่อนโหลดเสร็จหน้าจะล้น
  await waitForSarabun();

  const parts = buildSalesParts(data);
  const probe = buildSalesProbe(parts);

  try {
    return buildSalesPages(data, parts, probe);
  } finally {
    document.body.removeChild(probe.root);
  }
}

export async function generateSalesCommercialPdf(data: SalesCommercialPdfData) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const pagesHtml = await buildSalesCommercialPagesHtml(data);

  await openMultiPagePdfFromHtml(data.pageId, pagesHtml, {
    wrapperWidth: `${SALES_PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}
