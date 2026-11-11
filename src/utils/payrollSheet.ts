import type { TabularReport } from "@/utils/downloadTabularReport";
import type { PayrollPaymentExport, PayrollRunDetail } from "@/types/payroll";

const num = (v: number) => v.toFixed(2);

/**
 * ตารางส่งออกเงินเดือนรายงวด (CSV/Excel) — ใช้นำเข้าโปรแกรมบัญชี/Express เอง
 * ยังไม่มีสเปกนำเข้า Express จึงเป็นรูปแบบกลาง: หนึ่งแถวต่อพนักงาน ตัวเลขล้วน ไม่ใส่คอมมา
 */
export function toPayrollSheet(run: PayrollRunDetail): TabularReport {
  const rows = run.slips.map((s) => [
    s.employeeCode ?? "",
    s.displayName,
    s.position ?? "",
    s.departmentName ?? "",
    s.payType === "DAILY" ? "รายวัน" : "รายเดือน",
    num(s.basePay),
    String(s.paidDays),
    num(s.regularPay),
    num(s.absenceDeduction),
    num(s.otHours),
    num(s.otAmount),
    num(s.adjustmentEarnings),
    num(s.adjustmentDeductions),
    num(s.socialSecurity),
    num(s.providentFund),
    num(s.providentFundEmployer),
    num(s.withholdingTax),
    num(s.grossIncome),
    num(s.totalDeductions),
    num(s.netPay),
  ]);
  const t = run.totals;
  const totalRow = [
    "รวม",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    num(t.otAmount),
    "",
    "",
    num(t.socialSecurity),
    num(t.providentFund),
    num(t.providentFundEmployer),
    num(t.withholdingTax),
    num(t.grossIncome),
    num(t.totalDeductions),
    num(t.netPay),
  ];
  return {
    title: "สรุปเงินเดือน",
    filename: `payroll-${run.periodStart}_${run.periodEnd}`,
    meta: [
      `งวด: ${run.name} (${run.periodStart} ถึง ${run.periodEnd})`,
      `จำนวน ${t.slipCount} คน · ยอดสุทธิ ${num(t.netPay)} บาท`,
    ],
    headers: [
      "รหัสพนักงาน",
      "ชื่อ",
      "ตำแหน่ง",
      "แผนก",
      "ประเภทค่าจ้าง",
      "เงินเดือน / ค่าแรงรายวัน",
      "วันจ่าย",
      "ค่าจ้างปกติ",
      "หักขาด/ลาไม่รับเงิน",
      "ชั่วโมง OT",
      "ค่า OT",
      "รายได้อื่น (ปรับ)",
      "หักอื่น (ปรับ)",
      "ประกันสังคม",
      "กองทุน (พนักงาน)",
      "กองทุน (นายจ้างสมทบ)",
      "ภาษีหัก ณ ที่จ่าย",
      "รายได้รวม",
      "หักรวม",
      "สุทธิ",
    ],
    rows: [...rows, totalRow],
    groupRows: [rows.length],
  };
}

/**
 * ตารางรายการจ่ายเงินเดือน (ส่งออกให้ฝ่ายการเงินโอนเงิน) — หนึ่งแถวต่อพนักงาน: ธนาคาร/เลขบัญชี/ยอดที่ต้องจ่าย
 * ข้อมูลมาจาก backend (POST :id/payment-export) ที่ตรวจข้อมูลธนาคารและบันทึกประวัติส่งออกแล้ว · เลขบัญชีเป็นข้อความ
 */
export function toPaymentSheet(data: PayrollPaymentExport): TabularReport {
  const rows = data.rows.map((r) => [
    r.employeeCode ?? "",
    r.displayName,
    r.bankName,
    r.bankAccountNo,
    r.bankAccountName ?? "",
    num(r.amount),
  ]);
  return {
    title: "รายการจ่ายเงินเดือน",
    filename: `payroll-payment-${data.periodStart}_${data.periodEnd}`,
    meta: [
      `งวด: ${data.runName} (${data.periodStart} ถึง ${data.periodEnd})`,
      `จำนวน ${data.rows.length} คน · ยอดรวม ${num(data.totalAmount)} บาท`,
    ],
    headers: ["รหัสพนักงาน", "ชื่อ", "ธนาคาร", "เลขบัญชี", "ชื่อบัญชี", "ยอดจ่าย (บาท)"],
    rows: [...rows, ["รวม", "", "", "", "", num(data.totalAmount)]],
    groupRows: [rows.length],
  };
}
