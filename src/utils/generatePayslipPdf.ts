import { getCompanyInfoSnapshot } from "@/lib/company/company-info";
import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";
import type { PayrollSlip } from "@/types/payroll";

import {
  companyLogoUrl,
  ensureCompanyInfo,
  escapeHtml,
  openMultiPagePdfFromHtml,
} from "./pdf-common";

export type PayslipPdfRun = {
  name: string;
  periodStart: string;
  periodEnd: string;
  status: string;
};

const PAGE_ID = "payslip-pdf";
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

const money = (v: number) =>
  v.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function thaiDate(value: string) {
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

type Row = { label: string; detail?: string; amount: number };

function incomeRows(s: PayrollSlip): Row[] {
  const rows: Row[] = [
    {
      label: s.payType === "DAILY" ? "ค่าแรงรายวัน" : "เงินเดือน",
      detail:
        s.payType === "DAILY"
          ? `${money(s.basePay)} บาท × ${s.paidDays} วัน`
          : undefined,
      amount: s.regularPay,
    },
  ];
  if (s.otAmount > 0 || s.otHours > 0) {
    rows.push({ label: "ค่าล่วงเวลา (OT)", detail: `${s.otHours} ชม.`, amount: s.otAmount });
  }
  for (const a of s.adjustments.filter((x) => x.kind === "EARNING")) {
    rows.push({ label: a.label, amount: a.amount });
  }
  return rows;
}

function deductionRows(s: PayrollSlip): Row[] {
  const rows: Row[] = [];
  if (s.absenceDeduction > 0) {
    rows.push({
      label: "หักขาดงาน/ลาไม่รับเงิน",
      detail: `${s.absentDays + s.unpaidLeaveDays} วัน`,
      amount: s.absenceDeduction,
    });
  }
  rows.push({ label: "ประกันสังคม", amount: s.socialSecurity });
  if (s.providentFund > 0) {
    rows.push({ label: "กองทุนสำรองเลี้ยงชีพ", amount: s.providentFund });
  }
  rows.push({ label: "ภาษีหัก ณ ที่จ่าย", amount: s.withholdingTax });
  for (const a of s.adjustments.filter((x) => x.kind === "DEDUCTION")) {
    rows.push({ label: a.label, amount: a.amount });
  }
  return rows;
}

const rowHtml = (r: Row) => `
  <tr>
    <td>${escapeHtml(r.label)}${r.detail ? `<span class="ps-detail"> (${escapeHtml(r.detail)})</span>` : ""}</td>
    <td class="r">${money(r.amount)}</td>
  </tr>`;

function pageHtml(run: PayslipPdfRun, s: PayrollSlip, index: number) {
  const company = getCompanyInfoSnapshot();
  const income = incomeRows(s);
  const deductions = deductionRows(s);
  const draftMark =
    run.status === "FINALIZED"
      ? ""
      : `<div class="ps-draft">${run.status === "CANCELLED" ? "งวดถูกยกเลิก" : "ฉบับร่าง — ยังไม่ปิดงวด"}</div>`;

  return `
    <style>
      @import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap");
      * { box-sizing: border-box; }
      .ps-page { width: ${PAGE_WIDTH}px; height: ${PAGE_HEIGHT}px; overflow: hidden; background: #fff; position: relative;
        padding: 40px 46px; color: #333; font-family: "Sarabun", Tahoma, sans-serif; font-size: 13px; }
      .ps-top { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #5a7a1f; padding-bottom: 12px; }
      .ps-logo { width: 62px; height: 62px; object-fit: contain; }
      .ps-co { flex: 1; line-height: 1.5; }
      .ps-co .n { font-size: 16px; font-weight: 700; }
      .ps-co .a { font-size: 11px; color: #666; }
      .ps-title { text-align: right; }
      .ps-title .t { font-size: 20px; font-weight: 700; color: #5a7a1f; }
      .ps-title .s { font-size: 12px; color: #666; }
      .ps-draft { position: absolute; top: 120px; right: 46px; border: 2px solid #d46b08; color: #d46b08;
        padding: 2px 12px; font-weight: 700; border-radius: 4px; transform: rotate(-4deg); }
      .ps-emp { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-top: 16px;
        border: 1px solid #ccc; border-radius: 6px; padding: 10px 14px; }
      .ps-emp div span { color: #777; display: inline-block; width: 110px; }
      .ps-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
      .ps-table { width: 100%; border-collapse: collapse; }
      .ps-table th { background: #f1f5e8; text-align: left; padding: 7px 10px; border: 1px solid #ccc; }
      .ps-table th.r, .ps-table td.r { text-align: right; }
      .ps-table td { padding: 6px 10px; border: 1px solid #e3e3e3; vertical-align: top; }
      .ps-table tfoot td { font-weight: 700; background: #fafafa; border: 1px solid #ccc; }
      .ps-detail { color: #888; font-size: 11px; }
      .ps-net { margin-top: 18px; border: 2px solid #5a7a1f; border-radius: 8px; padding: 12px 16px;
        display: flex; justify-content: space-between; align-items: center; }
      .ps-net .l { font-size: 15px; font-weight: 700; }
      .ps-net .v { font-size: 24px; font-weight: 700; color: #3f5a14; }
      .ps-baht { margin-top: 6px; font-size: 12px; color: #555; text-align: right; }
      .ps-days { margin-top: 14px; font-size: 12px; color: #555; }
      .ps-foot { margin-top: 70px; display: flex; justify-content: space-between; }
      .ps-sign { width: 220px; text-align: center; line-height: 1.7; }
      .ps-sign .line { border-bottom: 1px solid #555; height: 30px; margin-bottom: 4px; }
      .ps-note { position: absolute; left: 46px; right: 46px; bottom: 28px; font-size: 10px; color: #999; text-align: center; }
    </style>
    <div class="ps-page" id="${PAGE_ID}-${index}">
      <div class="ps-top">
        <img class="ps-logo" src="${companyLogoUrl()}" alt="" crossorigin="anonymous" />
        <div class="ps-co">
          <div class="n">${escapeHtml(company.nameTh)}</div>
          <div class="a">${escapeHtml(company.addressText)}</div>
        </div>
        <div class="ps-title">
          <div class="t">สลิปเงินเดือน</div>
          <div class="s">${escapeHtml(run.name)}</div>
          <div class="s">${escapeHtml(thaiDate(run.periodStart))} – ${escapeHtml(thaiDate(run.periodEnd))}</div>
        </div>
      </div>
      ${draftMark}

      <div class="ps-emp">
        <div><span>ชื่อ-สกุล</span><b>${escapeHtml(s.displayName)}</b></div>
        <div><span>รหัสพนักงาน</span>${escapeHtml(s.employeeCode ?? "-")}</div>
        <div><span>ตำแหน่ง</span>${escapeHtml(s.position ?? "-")}</div>
        <div><span>แผนก</span>${escapeHtml(s.departmentName ?? "-")}</div>
        <div><span>ประเภทค่าจ้าง</span>${s.payType === "DAILY" ? "รายวัน" : "รายเดือน"}</div>
        <div><span>ฐานค่าจ้าง</span>${money(s.basePay)} บาท${s.payType === "DAILY" ? "/วัน" : "/เดือน"}</div>
      </div>

      <div class="ps-cols">
        <table class="ps-table">
          <thead><tr><th>รายได้</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead>
          <tbody>${income.map(rowHtml).join("")}</tbody>
          <tfoot><tr><td>รวมรายได้</td><td class="r">${money(s.grossIncome)}</td></tr></tfoot>
        </table>
        <table class="ps-table">
          <thead><tr><th>รายการหัก</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead>
          <tbody>${deductions.map(rowHtml).join("")}</tbody>
          <tfoot><tr><td>รวมรายการหัก</td><td class="r">${money(s.totalDeductions)}</td></tr></tfoot>
        </table>
      </div>

      <div class="ps-net">
        <div class="l">เงินได้สุทธิ</div>
        <div class="v">${money(s.netPay)} บาท</div>
      </div>
      <div class="ps-baht">( ${escapeHtml(numberToThaiBahtText(s.netPay))} )</div>

      <div class="ps-days">
        สรุปวัน — มาทำงาน ${s.attendedDays} · ขาด ${s.absentDays} · ลาได้รับเงิน ${s.paidLeaveDays} · ลาไม่รับเงิน ${s.unpaidLeaveDays}
        ${s.providentFundEmployer > 0 ? ` · นายจ้างสมทบกองทุน ${money(s.providentFundEmployer)} บาท` : ""}
      </div>

      <div class="ps-foot">
        <div class="ps-sign"><div class="line"></div><div>ผู้จ่ายเงิน</div></div>
        <div class="ps-sign"><div class="line"></div><div>ผู้รับเงิน</div></div>
      </div>
      <div class="ps-note">เอกสารลับ — ออกโดยระบบ ERP · พิมพ์เมื่อ ${escapeHtml(new Date().toLocaleString("th-TH"))}</div>
    </div>`;
}

/**
 * สลิปเงินเดือน PDF — หนึ่งหน้า A4 ต่อพนักงาน เปิดในแท็บใหม่
 * ส่งหลายสลิปได้ (พิมพ์ทั้งงวด) — สลิปที่ไม่มีรายได้เลย (ไม่มีฐานค่าจ้าง) ผู้เรียกกรองออกเอง
 */
export async function openPayslipPdf(run: PayslipPdfRun, slips: PayrollSlip[]) {
  if (slips.length === 0) {
    throw new Error("ไม่มีสลิปให้พิมพ์");
  }
  await ensureCompanyInfo();
  await openMultiPagePdfFromHtml(
    PAGE_ID,
    slips.map((s, i) => pageHtml(run, s, i)),
    { wrapperWidth: `${PAGE_WIDTH}px`, includeBaseStyles: false },
  );
}
