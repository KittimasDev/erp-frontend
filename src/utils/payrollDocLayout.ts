import { getCompanyInfoSnapshot } from "@/lib/company/company-info";

import { companyLogoUrl, escapeHtml } from "./pdf-common";

/** เอกสาร HRM/Payroll ทุกใบใช้หน้า A4 ขนาดเดียวกัน (96dpi) เพื่อให้สัดส่วนตัวอักษร/โลโก้เท่ากัน */
export const PAYROLL_DOC_WIDTH = 794;
export const PAYROLL_DOC_HEIGHT = 1123;

/**
 * CSS ร่วมของเอกสารเงินเดือน — หน้า A4 เป็น flex column เพื่อดันลายเซ็น/หมายเหตุลงล่างหน้า
 * โลโก้กำหนดความสูงคงที่ ความกว้างตามสัดส่วนจริงของไฟล์ (ไม่บีบเป็นสี่เหลี่ยมจัตุรัส)
 */
export function payrollDocBaseCss() {
  return `
    @import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap");
    * { box-sizing: border-box; }
    .pd-page { width: ${PAYROLL_DOC_WIDTH}px; height: ${PAYROLL_DOC_HEIGHT}px; overflow: hidden; background: #fff;
      position: relative; display: flex; flex-direction: column; padding: 48px 56px 40px; color: #2b2b2b;
      font-family: "Sarabun", Tahoma, sans-serif; font-size: 14px; line-height: 1.6; }
    .pd-top { display: flex; align-items: center; gap: 18px; padding-bottom: 16px; border-bottom: 3px solid #5a7a1f; }
    .pd-logo-wrap { flex: none; display: flex; align-items: center; justify-content: center; }
    .pd-logo { display: block; height: 68px; width: auto; max-width: 150px; object-fit: contain; }
    .pd-co { flex: 1; min-width: 0; line-height: 1.5; }
    .pd-co .n { font-size: 18px; font-weight: 700; color: #1f2d0a; }
    .pd-co .a { font-size: 12px; color: #666; margin-top: 2px; }
    .pd-title { flex: none; text-align: right; max-width: 260px; }
    .pd-title .t { font-size: 24px; font-weight: 700; color: #4a6a14; line-height: 1.25; }
    .pd-title .s { font-size: 12px; color: #666; margin-top: 2px; }
    .pd-box { border: 1px solid #d5dac8; border-radius: 8px; padding: 12px 18px; background: #fafcf6; }
    .pd-box-title { font-size: 13px; font-weight: 700; color: #4a6a14; margin-bottom: 6px; }
    .pd-row { display: flex; gap: 10px; padding: 3px 0; }
    .pd-row > span { width: 170px; flex: none; color: #777; }
    .pd-row > b { flex: 1; font-weight: 600; overflow-wrap: anywhere; }
    .pd-table { width: 100%; border-collapse: collapse; }
    .pd-table th { background: #eef3df; color: #3f5a14; font-weight: 700; text-align: left; padding: 9px 12px;
      border: 1px solid #d5dac8; }
    .pd-table td { padding: 8px 12px; border: 1px solid #e3e6da; vertical-align: top; }
    .pd-table .r { text-align: right; }
    .pd-table tfoot td, .pd-table .pd-total td { font-weight: 700; background: #f6f8ef; border: 1px solid #d5dac8; }
    .pd-spacer { flex: 1; }
    .pd-foot { display: flex; justify-content: flex-end; gap: 40px; padding-top: 24px; }
    .pd-sign { width: 230px; text-align: center; line-height: 1.7; }
    .pd-sign .line { border-bottom: 1px solid #666; height: 44px; margin-bottom: 6px; }
    .pd-note { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e3e6da; font-size: 11px; color: #999;
      text-align: center; }
  `;
}

/** หัวเอกสารมาตรฐาน: โลโก้ + ชื่อ/ที่อยู่/เลขผู้เสียภาษี/โทร + ชื่อเอกสารด้านขวา */
export function payrollDocHeaderHtml(title: string, subLines: string[] = []) {
  const company = getCompanyInfoSnapshot();
  const logo = companyLogoUrl();
  const contact = [
    company.taxId ? `เลขประจำตัวผู้เสียภาษี ${company.taxId}` : "",
    company.phone ? `โทร ${company.phone}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `
    <div class="pd-top">
      ${
        logo
          ? `<div class="pd-logo-wrap"><img class="pd-logo" src="${logo}" alt="" crossorigin="anonymous" /></div>`
          : ""
      }
      <div class="pd-co">
        <div class="n">${escapeHtml(company.nameTh)}</div>
        ${company.addressText ? `<div class="a">${escapeHtml(company.addressText)}</div>` : ""}
        ${contact ? `<div class="a">${escapeHtml(contact)}</div>` : ""}
      </div>
      <div class="pd-title">
        <div class="t">${escapeHtml(title)}</div>
        ${subLines.map((l) => `<div class="s">${escapeHtml(l)}</div>`).join("")}
      </div>
    </div>`;
}
