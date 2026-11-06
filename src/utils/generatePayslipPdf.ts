import { numberToThaiBahtText } from "@/utils/numberToThaiBahtText";
import type { PayrollSlip } from "@/types/payroll";

import {
  PAYROLL_DOC_WIDTH,
  payrollDocBaseCss,
  payrollDocHeaderHtml,
} from "./payrollDocLayout";
import { ensureCompanyInfo, escapeHtml, openMultiPagePdfFromHtml } from "./pdf-common";

export type PayslipPdfRun = {
  name: string;
  periodStart: string;
  periodEnd: string;
  status: string;
};

const PAGE_ID = "payslip-pdf";
const PAGE_WIDTH = PAYROLL_DOC_WIDTH;

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
  const income = incomeRows(s);
  const deductions = deductionRows(s);
  const draftMark =
    run.status === "FINALIZED"
      ? ""
      : `<div class="ps-draft">${run.status === "CANCELLED" ? "งวดถูกยกเลิก" : "ฉบับร่าง — ยังไม่ปิดงวด"}</div>`;

  return `
    <style>
      ${payrollDocBaseCss()}
      .ps-draft { position: absolute; top: 140px; right: 56px; border: 2px solid #d46b08; color: #d46b08;
        padding: 2px 14px; font-weight: 700; border-radius: 4px; transform: rotate(-4deg); background: #fff; }
      .ps-emp { display: grid; grid-template-columns: 1fr 1fr; gap: 0 28px; margin-top: 22px; }
      .ps-emp .pd-row > span { width: 110px; }
      .ps-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 22px; }
      .ps-cols .pd-table td:first-child { width: 62%; }
      .ps-detail { color: #888; font-size: 12px; }
      .ps-net { margin-top: 24px; border: 2px solid #5a7a1f; border-radius: 10px; padding: 14px 22px; background: #f6f8ef;
        display: flex; justify-content: space-between; align-items: center; }
      .ps-net .l { font-size: 17px; font-weight: 700; }
      .ps-net .v { font-size: 28px; font-weight: 700; color: #3f5a14; }
      .ps-baht { margin-top: 8px; font-size: 13px; color: #555; text-align: right; }
      .ps-days { margin-top: 22px; font-size: 13px; color: #555; padding: 10px 14px; border: 1px dashed #c9cfba; border-radius: 8px; }
    </style>
    <div class="pd-page" id="${PAGE_ID}-${index}">
      ${payrollDocHeaderHtml("สลิปเงินเดือน", [
        run.name,
        `${thaiDate(run.periodStart)} – ${thaiDate(run.periodEnd)}`,
      ])}
      ${draftMark}

      <div class="pd-box ps-emp">
        <div class="pd-row"><span>ชื่อ-สกุล</span><b>${escapeHtml(s.displayName)}</b></div>
        <div class="pd-row"><span>รหัสพนักงาน</span><b>${escapeHtml(s.employeeCode ?? "-")}</b></div>
        <div class="pd-row"><span>ตำแหน่ง</span><b>${escapeHtml(s.position ?? "-")}</b></div>
        <div class="pd-row"><span>แผนก</span><b>${escapeHtml(s.departmentName ?? "-")}</b></div>
        <div class="pd-row"><span>ประเภทค่าจ้าง</span><b>${s.payType === "DAILY" ? "รายวัน" : "รายเดือน"}</b></div>
        <div class="pd-row"><span>ฐานค่าจ้าง</span><b>${money(s.basePay)} บาท${s.payType === "DAILY" ? "/วัน" : "/เดือน"}</b></div>
      </div>

      <div class="ps-cols">
        <table class="pd-table">
          <thead><tr><th>รายได้</th><th class="r">จำนวนเงิน (บาท)</th></tr></thead>
          <tbody>${income.map(rowHtml).join("")}</tbody>
          <tfoot><tr><td>รวมรายได้</td><td class="r">${money(s.grossIncome)}</td></tr></tfoot>
        </table>
        <table class="pd-table">
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

      <div class="pd-spacer"></div>
      <div class="pd-foot" style="justify-content: space-between;">
        <div class="pd-sign"><div class="line"></div><div>ผู้จ่ายเงิน</div></div>
        <div class="pd-sign"><div class="line"></div><div>ผู้รับเงิน</div></div>
      </div>
      <div class="pd-note">เอกสารลับ — ออกโดยระบบ ERP · พิมพ์เมื่อ ${escapeHtml(new Date().toLocaleString("th-TH"))}</div>
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
