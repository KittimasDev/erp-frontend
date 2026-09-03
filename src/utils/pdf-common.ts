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
  options?: {
    /** ความกว้าง wrapper — เอกสารที่หน้ากว้างไม่ใช่ 794px ต้องส่งค่าของตัวเอง */
    wrapperWidth?: string;
    /**
     * แนบ `basePdfStyles()` ให้หรือไม่ — เอกสารที่มี `<style>` ของตัวเองต้องส่ง
     * `false` ไม่งั้นคลาสชื่อซ้ำ (`.logo` `.info-card` `.info-grid` `.title`)
     * จะทับกันจนเลย์เอาต์เพี้ยน
     */
    includeBaseStyles?: boolean;
  },
) {
  if (pagesHtml.length === 0) {
    throw new Error("PDF has no pages to render");
  }

  const { wrapperWidth = "794px", includeBaseStyles = true } = options ?? {};

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
};

export type SalesCommercialPdfData = {
  pageId: string;
  titleTh: string;
  /** ไม่ส่ง = ไม่พิมพ์บรรทัดอังกฤษใต้ชื่อเอกสาร */
  titleEn?: string;
  docNo: string;
  docDate: string;
  /** ป้ายใต้เลขที่ เช่น ฉบับแก้ไข วันที่ … */
  revisionLabel?: string;
  draftBanner?: string;
  infoRows: SalesCommercialPdfInfoRow[];
  infoSections?: Array<{
    title?: string;
    rows: SalesCommercialPdfInfoRow[];
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
};

export async function generateSalesCommercialPdf(data: SalesCommercialPdfData) {
  // ต้องได้ข้อมูลบริษัทก่อนประกอบ HTML — ไม่มีค่า hardcode สำรองแล้ว
  await ensureCompanyInfo();

  const priceCols = data.withPrices;
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
  };

  const renderInfoRows = (rows: SalesCommercialPdfInfoRow[]) =>
    rows
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
        <span class="value">${
          row.html ? sanitizeDocumentHtml(row.value) || "—" : escapeHtml(row.value)
        }</span>
      </div>`;
      })
      .join("");

  const renderItemRows = (items: SalesLinePdfItem[]) =>
    items
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

  const groups: SalesCommercialPdfItemGroup[] =
    data.itemGroups && data.itemGroups.length > 0
      ? data.itemGroups
      : [{ items: data.items }];
  const grouped = Boolean(data.itemGroups && data.itemGroups.length > 0);
  const hasExtra = groups.some((group) =>
    group.items.some((item) => item.extra != null),
  );
  const colCount = priceCols ? 8 : hasExtra ? 6 : 5;

  const headerCells = priceCols
    ? `<th class="col-no">${escapeHtml(labels.no)}</th><th class="col-code">${escapeHtml(labels.code)}</th><th class="col-name">${escapeHtml(labels.name)}</th><th class="col-unit">${escapeHtml(labels.unit)}</th><th class="col-qty">${escapeHtml(labels.qty)}</th><th class="col-price">${escapeHtml(labels.price)}</th><th class="col-disc">${escapeHtml(labels.disc)}</th><th class="col-amount">${escapeHtml(labels.amount)}</th>`
    : hasExtra
      ? `<th class="col-no">${escapeHtml(labels.no)}</th><th class="col-code">${escapeHtml(labels.code)}</th><th class="col-name">${escapeHtml(labels.name)}</th><th class="col-unit">${escapeHtml(labels.unit)}</th><th class="col-qty">${escapeHtml(labels.qty)}</th><th class="col-extra">${escapeHtml(labels.extra)}</th>`
      : `<th class="col-no">${escapeHtml(labels.no)}</th><th class="col-code">${escapeHtml(labels.code)}</th><th class="col-name">${escapeHtml(labels.name)}</th><th class="col-unit">${escapeHtml(labels.unit)}</th><th class="col-qty">${escapeHtml(labels.qty)}</th>`;

  const tablesHtml = groups
    .map((group, groupIndex) => {
      const pad =
        !grouped && groupIndex === 0
          ? Array.from({ length: Math.max(0, 5 - group.items.length) })
              .map(
                () =>
                  `<tr class="empty-row">${Array.from({ length: colCount })
                    .map(() => "<td>&nbsp;</td>")
                    .join("")}</tr>`,
              )
              .join("")
          : "";
      return `
      <div class="round-block">
        ${group.heading ? `<div class="round-heading">${escapeHtml(group.heading)}</div>` : ""}
        <table class="items-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody>${renderItemRows(group.items)}${pad}</tbody>
        </table>
      </div>`;
    })
    .join("");

  const infoSections =
    data.infoSections && data.infoSections.length > 0
      ? data.infoSections
      : [{ rows: data.infoRows }];
  const infoCardsHtml = infoSections
    .map(
      (section) => `
      <div class="info-card">
        ${section.title ? `<div class="info-section-title">${escapeHtml(section.title)}</div>` : ""}
        <div class="info-grid">${renderInfoRows(section.rows)}</div>
      </div>`,
    )
    .join("");

  const defaultTotals: SalesCommercialPdfTotalsLine[] = [
    { label: "ยอดรวม", value: data.subtotalAmount ?? 0 },
    { label: "ส่วนลด", value: data.discountAmount ?? 0 },
    { label: "ภาษีมูลค่าเพิ่ม", value: data.vatAmount ?? 0 },
    { label: "ยอดสุทธิ", value: data.totalAmount ?? 0, grand: true },
  ];
  const totalsLines = data.totalsLines ?? defaultTotals;
  const totalsHtml = priceCols
    ? `
    <div class="totals-row${grouped ? " totals-row-separated" : ""}">
      <div class="totals-spacer"></div>
      <div class="totals-box">
        ${totalsLines
          .map(
            (line) =>
              `<div class="total-line${line.grand ? " total-line-grand" : ""}"><span>${escapeHtml(line.label)}</span><strong>${formatMoney(line.value)}</strong></div>`,
          )
          .join("")}
      </div>
    </div>`
    : "";

  // บัญชีธนาคารหลักจาก master ข้อมูลบริษัท — เอกสารกลุ่มขายเท่านั้น
  const bankLine = companyBankLineHtml();
  const bankHtml = bankLine
    ? `<div class="bank-box"><strong>ชำระเงินที่</strong><div>${bankLine}</div></div>`
    : "";

  const remarkBody = data.remarkIsHtml
    ? sanitizeDocumentHtml(data.remark)
    : data.remark
      ? escapeHtml(data.remark)
      : "";
  const remarkHtml = remarkBody
    ? `<div class="remark-box"><strong>${escapeHtml(data.remarkLabel || "หมายเหตุ")}</strong><div>${remarkBody}</div></div>`
    : "";

  const sigs: SalesSignatureSlot[] = data.signatures ?? [
    "ผู้จัดทำ",
    "ผู้ตรวจสอบ",
    "ผู้อนุมัติ",
  ];
  const signatureHtml = `
    <div class="signature-box">
      ${sigs
        .map((slot) => {
          const { title, name, signatureDataUrl } =
            typeof slot === "string" ? { title: slot } : slot;
          return `
        <div class="signature">
          <div class="sig-title">${escapeHtml(title)}</div>
          <div class="sig-space">${
            signatureDataUrl
              ? `<img src="${signatureDataUrl}" class="sig-image" alt="" />`
              : ""
          }</div>
          <div class="sig-line"></div>
          <div class="sig-name">${name ? escapeHtml(name) : "&nbsp;"}</div>
          <div class="sig-date">วันที่ ....../....../..........</div>
        </div>`;
        })
        .join("")}
    </div>`;

  const html = `
    <div id="${data.pageId}" class="pdf-page">
      ${companyHeaderHtml()}
      <div class="title-block">
        <div class="title">${escapeHtml(data.titleTh)}</div>
        ${data.titleEn ? `<div class="title-sub">${escapeHtml(data.titleEn)}</div>` : ""}
      </div>
      ${data.draftBanner ? `<div class="draft-banner">${escapeHtml(data.draftBanner)}</div>` : ""}
      <div class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">เลขที่เอกสาร</span>
          <strong class="meta-value">${escapeHtml(data.docNo)}</strong>
          ${data.revisionLabel ? `<div class="meta-revision">${escapeHtml(data.revisionLabel)}</div>` : ""}
        </div>
        <div class="meta-item">
          <span class="meta-label">วันที่</span>
          <strong class="meta-value">${escapeHtml(data.docDate)}</strong>
        </div>
      </div>
      ${infoCardsHtml}
      ${tablesHtml}
      ${totalsHtml}
      ${remarkHtml}
      ${bankHtml}
      ${signatureHtml}
      <div class="footer-note">เอกสารออกจากระบบ ERP · ${escapeHtml(companyBrandName())}</div>
    </div>
  `;

  await openPdfFromHtml(data.pageId, html);
}
