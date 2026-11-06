import {
  PAYROLL_DOC_WIDTH,
  payrollDocBaseCss,
  payrollDocHeaderHtml,
} from "./payrollDocLayout";
import { ensureCompanyInfo, escapeHtml, openMultiPagePdfFromHtml } from "./pdf-common";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";

export type SalaryCertificatePdfData = {
  certNo: string;
  /** วันที่ออกหนังสือ (YYYY-MM-DD) */
  issuedAt: string;
  /** เรียน ... (ผู้รับ) เช่น "ธนาคาร/สถานทูต/ผู้ที่เกี่ยวข้อง" */
  addressedTo: string;
  /** วัตถุประสงค์ เช่น ยื่นขอสินเชื่อ */
  purpose?: string;
  company: { name: string; taxId?: string; address?: string; phone?: string };
  employee: {
    name: string;
    nationalId?: string;
    employeeCode?: string;
    position?: string;
    departmentName?: string;
    /** วันที่เริ่มงาน (YYYY-MM-DD) */
    hireDate?: string;
  };
  payType: "MONTHLY" | "DAILY";
  /** เงินเดือน (รายเดือน) หรือค่าจ้างต่อวัน (รายวัน) */
  basePay: number;
  /** รายได้อื่นเฉลี่ยต่อเดือน เช่น ค่าตำแหน่ง เบี้ยขยัน (ไม่ใส่ = ไม่แสดง) */
  otherIncome?: number;
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

/** ระยะเวลาทำงานตั้งแต่วันเริ่มงานถึงวันที่ออกหนังสือ เช่น "2 ปี 3 เดือน" */
function tenureText(hireDate?: string, until?: string) {
  if (!hireDate) return "";
  const from = new Date(hireDate);
  const to = new Date(until ?? Date.now());
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return "";
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  months = Math.max(0, months);
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [y > 0 ? `${y} ปี` : "", m > 0 ? `${m} เดือน` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "ไม่ถึง 1 เดือน";
}

function pageHtml(d: SalaryCertificatePdfData, index = 0) {
  const monthly = d.payType === "MONTHLY";
  const other = d.otherIncome && d.otherIncome > 0 ? d.otherIncome : 0;
  const total = d.basePay + other;
  const tenure = tenureText(d.employee.hireDate, d.issuedAt);
  const unit = monthly ? "บาทต่อเดือน" : "บาทต่อวัน";
  const roleText = [d.employee.position, d.employee.departmentName ? `ฝ่าย/แผนก ${d.employee.departmentName}` : ""]
    .filter(Boolean)
    .join(" ");

  return `
    <style>
      ${payrollDocBaseCss()}
      .pd-page { font-size: 15px; line-height: 1.9; }
      .sc-meta { margin-top: 18px; display: flex; justify-content: space-between; color: #555; font-size: 13px; line-height: 1.6; }
      .sc-title { text-align: center; font-size: 26px; font-weight: 700; color: #4a6a14; margin: 34px 0 26px; letter-spacing: 1px; }
      .sc-to { margin-bottom: 12px; }
      .sc-body p { margin: 0 0 12px; text-indent: 44px; text-align: justify; }
      .sc-box { margin: 18px 0; line-height: 1.8; }
      .sc-total b { font-size: 17px; color: #3f5a14; }
    </style>
    <div class="pd-page" id="${PAGE_ID}-${index}">
      ${payrollDocHeaderHtml("")}
      <div class="sc-meta">
        <div>เลขที่ <b>${escapeHtml(d.certNo)}</b></div>
        <div>วันที่ ${escapeHtml(thaiDate(d.issuedAt))}</div>
      </div>

      <div class="sc-title">หนังสือรับรองเงินเดือน</div>
      <div class="sc-to">เรียน ${escapeHtml(d.addressedTo.trim() || "ผู้ที่เกี่ยวข้อง")}</div>

      <div class="sc-body">
        <p>
          หนังสือฉบับนี้ให้ไว้เพื่อรับรองว่า <b>${escapeHtml(d.employee.name)}</b>
          ${d.employee.nationalId ? `เลขประจำตัวประชาชน ${escapeHtml(d.employee.nationalId)}` : ""}
          เป็นพนักงานของ${escapeHtml(d.company.name)}
          ${roleText ? `ตำแหน่ง ${escapeHtml(roleText)}` : ""}
          ${d.employee.hireDate ? `เริ่มปฏิบัติงานตั้งแต่วันที่ ${escapeHtml(thaiDate(d.employee.hireDate))}` : ""}
          ${tenure ? `รวมอายุงาน ${escapeHtml(tenure)}` : ""}
          และปัจจุบันยังคงปฏิบัติงานอยู่ โดยได้รับค่าจ้างดังนี้
        </p>
      </div>

      <div class="pd-box sc-box">
        ${d.employee.employeeCode ? `<div class="pd-row"><span>รหัสพนักงาน</span><b>${escapeHtml(d.employee.employeeCode)}</b></div>` : ""}
        <div class="pd-row"><span>${monthly ? "เงินเดือน" : "ค่าจ้างรายวัน"}</span><b>${money(d.basePay)} ${unit}</b></div>
        ${other > 0 ? `<div class="pd-row"><span>รายได้อื่นเฉลี่ย</span><b>${money(other)} ${unit}</b></div>` : ""}
        ${other > 0 ? `<div class="pd-row sc-total"><span>รวมรายได้</span><b>${money(total)} ${unit}</b></div>` : ""}
        <div class="pd-row"><span>ตัวอักษร</span><b>( ${escapeHtml(numberToThaiBahtText(total))} ${monthly ? "ต่อเดือน" : "ต่อวัน"} )</b></div>
      </div>

      <div class="sc-body">
        <p>
          ${d.purpose?.trim() ? `หนังสือรับรองนี้ออกให้เพื่อใช้ ${escapeHtml(d.purpose.trim())} เท่านั้น` : "จึงออกหนังสือรับรองฉบับนี้ไว้เป็นหลักฐาน"}
        </p>
      </div>

      <div class="pd-spacer"></div>
      <div class="pd-foot">
        <div class="pd-sign">
          <div class="line"></div>
          <div>${escapeHtml(d.signerName?.trim() ? `( ${d.signerName.trim()} )` : "(                                        )")}</div>
          <div>${escapeHtml(d.signerTitle?.trim() || "ผู้มีอำนาจลงนาม")}</div>
        </div>
      </div>
      <div class="pd-note">ออกโดยระบบ ERP · ข้อมูล ณ วันที่ ${escapeHtml(thaiDate(d.issuedAt))}</div>
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
