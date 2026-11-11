import {
  PAYROLL_DOC_WIDTH,
  payrollDocBaseCss,
  payrollDocHeaderHtml,
} from "./payrollDocLayout";
import { ensureCompanyInfo, escapeHtml, openMultiPagePdfFromHtml } from "./pdf-common";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

export type SalaryCertificatePdfData = {
  /** วันที่ออกหนังสือ (YYYY-MM-DD) */
  issuedAt: string;
  /** เรียน ... (ผู้รับ) */
  addressedTo: string;
  /** วัตถุประสงค์ เช่น ยื่นขอสินเชื่อ */
  purpose?: string;
  company: { name: string };
  employee: {
    /** คำนำหน้า เช่น นาย / นาง / นางสาว */
    prefix?: string;
    /** ชื่อ นามสกุล */
    name: string;
    employeeCode?: string;
    position?: string;
    departmentName?: string;
    /** แผนกย่อย — แสดงเป็น "ฝ่าย" */
    sectionName?: string;
    /** วันที่เริ่มงาน (YYYY-MM-DD) */
    hireDate?: string;
    /** วันที่สิ้นสุดการทำงาน (YYYY-MM-DD) — ว่าง = ปัจจุบัน */
    endDate?: string;
  };
  payType: "MONTHLY" | "DAILY";
  /** เงินเดือน (รายเดือน) หรือค่าจ้างต่อวัน (รายวัน) */
  basePay: number;
  signerName?: string;
  signerTitle?: string;
};

const PAGE_ID = "salary-certificate-pdf";
const PAGE_WIDTH = PAYROLL_DOC_WIDTH;

const money = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function thaiDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

/** "บริษัท" ซ้ำไม่ได้ ถ้าชื่อบริษัทขึ้นต้นด้วยคำนี้อยู่แล้ว */
function companyText(name: string) {
  const n = name.trim();
  return /^(บริษัท|บจก\.|หจก\.|ห้างหุ้นส่วน)/.test(n) ? n : `บริษัท ${n}`;
}

function pageHtml(d: SalaryCertificatePdfData, index = 0) {
  const monthly = d.payType === "MONTHLY";
  const e = d.employee;
  const fullName = [e.prefix?.trim(), e.name.trim()].filter(Boolean).join(" ");
  const parts = [
    e.position ? `ได้ปฏิบัติงานในตำแหน่ง ${e.position}` : "ได้ปฏิบัติงาน",
    e.departmentName ? `แผนก ${e.departmentName}` : "",
    e.sectionName ? `ฝ่าย ${e.sectionName}` : "",
    e.employeeCode ? `รหัสพนักงาน ${e.employeeCode}` : "",
    e.hireDate ? `ตั้งแต่วันที่ ${thaiDate(e.hireDate)}` : "",
    `ถึงวันที่ ${e.endDate ? thaiDate(e.endDate) : "ปัจจุบัน"}`,
  ].filter(Boolean);
  const rateLabel = monthly ? "มีอัตราเงินเดือนประจำเดือนละ" : "มีอัตราค่าจ้างวันละ";
  const purpose = d.purpose?.trim();

  return `
    <style>
      ${payrollDocBaseCss()}
      .pd-page { font-size: 16px; line-height: 2; }
      .sc-title { text-align: center; font-size: 26px; font-weight: 700; color: #4a6a14; margin: 34px 0 26px; letter-spacing: 1px; }
      .sc-to { margin-bottom: 14px; }
      .sc-body p { margin: 0 0 22px; text-indent: 56px; text-align: justify; }
      .sc-body p.sc-plain { text-indent: 0; }
    </style>
    <div class="pd-page" id="${PAGE_ID}-${index}">
      ${payrollDocHeaderHtml("")}
      <div class="sc-title">หนังสือรับรองเงินเดือน</div>
      <div class="sc-to">เรียน ${escapeHtml(d.addressedTo.trim() || "ผู้ที่เกี่ยวข้อง")}</div>

      <div class="sc-body">
        <p>${escapeHtml(companyText(d.company.name))} ขอรับรองว่า <b>${escapeHtml(fullName)}</b> ${escapeHtml(parts.join(" "))}</p>
        <p>${rateLabel} <b>${money(d.basePay)}</b> บาท (${escapeHtml(numberToThaiBahtText(d.basePay))}) ซึ่งอัตรานี้ไม่รวมค่าตอบแทนและเงินพิเศษอื่น ๆ</p>
        <p>เอกสารนี้ใช้เพื่อ ${purpose ? `<b>${escapeHtml(purpose)}</b>` : "............................................"} เท่านั้น</p>
        <p class="sc-plain">ออกเอกสารเมื่อวันที่ ${escapeHtml(thaiDate(d.issuedAt))}</p>
      </div>

      <div class="pd-spacer"></div>
      <div class="pd-foot">
        <div class="pd-sign">
          <div style="text-align:left">ลงชื่อ ............................................................</div>
          <div>${escapeHtml(d.signerName?.trim() ? `( ${d.signerName.trim()} )` : "(                                        )")}</div>
          <div>ตำแหน่ง ${escapeHtml(d.signerTitle?.trim() || "ผู้มีอำนาจลงนาม")}</div>
        </div>
      </div>
    </div>`;
}

/** เปิดหนังสือรับรองเงินเดือนเป็น PDF ในแท็บใหม่ — ดู ดาวน์โหลด และพิมพ์ได้จากตัวแสดง PDF */
export async function openSalaryCertificatePdf(data: SalaryCertificatePdfData) {
  await ensureCompanyInfo();
  await openMultiPagePdfFromHtml(PAGE_ID, [pageHtml(data)], {
    wrapperWidth: `${PAGE_WIDTH}px`,
    includeBaseStyles: false,
  });
}
