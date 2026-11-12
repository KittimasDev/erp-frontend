import { STANDARD_STATUS, standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";

/** เงินเดือน (HRM_PAYROLL) — ตรงกับ backend hrm/dto/payroll.dto.ts */
/** DRAFT → PENDING_APPROVAL → PENDING_PAYMENT → PAID → FINALIZED (+ CANCELLED) */
export type PayrollRunStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "PENDING_PAYMENT"
  | "PAID"
  | "FINALIZED"
  | "CANCELLED";

export type PayrollAdjustmentKind = "EARNING" | "DEDUCTION";

export type PayrollAdjustment = {
  id: string;
  kind: PayrollAdjustmentKind;
  label: string;
  amount: number;
};

export type PayrollSlip = {
  id: string;
  userId: string;
  employeeCode?: string | null;
  displayName: string;
  position?: string | null;
  departmentName?: string | null;
  payType: "MONTHLY" | "DAILY";
  basePay: number;
  attendedDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  paidHolidayDays: number;
  paidDays: number;
  otHours: number;
  regularPay: number;
  absenceDeduction: number;
  otAmount: number;
  adjustmentEarnings: number;
  adjustmentDeductions: number;
  socialSecurityBase: number;
  socialSecurity: number;
  providentFund: number;
  /** นายจ้างสมทบ (ไม่หักจากสุทธิ) */
  providentFundEmployer: number;
  withholdingTax: number;
  taxableIncomeAnnual: number;
  grossIncome: number;
  totalDeductions: number;
  netPay: number;
  warnings: string[];
  adjustments: PayrollAdjustment[];
};

export type PayrollTotals = {
  slipCount: number;
  grossIncome: number;
  totalDeductions: number;
  socialSecurity: number;
  providentFund: number;
  providentFundEmployer: number;
  withholdingTax: number;
  otAmount: number;
  netPay: number;
  warningCount: number;
};

export type PayrollRun = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollRunStatus;
  note?: string | null;
  cancelReason?: string | null;
  calculatedAt?: string | null;
  finalizedAt?: string | null;
  createdById?: string | null;
  submittedById?: string | null;
  submittedAt?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
  /** เหตุผลที่ส่งกลับแก้ไขล่าสุด */
  returnReason?: string | null;
  totals: PayrollTotals;
  createdAt: string;
};

/** เหตุผลที่ไม่คำนวณค่าจ้างพนักงานในงวด (ตรงกับ backend) */
export type PayrollExclusionReason = "RESIGNED" | "NOT_STARTED" | "NO_PAY_THIS_PERIOD" | "OTHER";

export type PayrollExclusionInput = {
  userId: string;
  reasonCode: PayrollExclusionReason;
  reasonNote?: string;
};

export type PayrollExclusion = PayrollExclusionInput & {
  employeeCode?: string | null;
  displayName: string;
  reasonNote?: string | null;
};

/** พนักงานที่ยังไม่มีฐานค่าจ้าง — missing: BASE_PAY (เงินเดือน/ค่าแรงรายวัน) / EMPLOYMENT_TYPE (ประเภทการจ้าง) */
export type PayBaseIssue = {
  userId: string;
  employeeCode?: string | null;
  displayName: string;
  missing: Array<"BASE_PAY" | "EMPLOYMENT_TYPE">;
};

export type PayBaseValidationApiResponse = {
  statusCode?: number;
  message: string;
  data: { count: number; issues: PayBaseIssue[] };
};

/** ประวัติเปลี่ยนสถานะงวด */
export type PayrollEvent = {
  id: string;
  /** SUBMIT | APPROVE | SEND_BACK | RETURN_TO_DRAFT | CANCEL | EXPORT_PAYMENTS | RECORD_PAYMENT | PAID | FINALIZE */
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  note?: string | null;
  performedById?: string | null;
  performedByName?: string | null;
  performedAt: string;
};

export type PayrollPaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export type PayrollPayment = {
  userId: string;
  employeeCode?: string | null;
  displayName: string;
  amountDue: number;
  amountPaid: number;
  status: PayrollPaymentStatus;
  paidDate?: string | null;
  method?: string | null;
  referenceNo?: string | null;
  note?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
  recordedByName?: string | null;
  recordedAt?: string | null;
};

export type PayrollPaymentSummary = {
  count: number;
  dueTotal: number;
  paidTotal: number;
  successCount: number;
  failedCount: number;
  pendingCount: number;
  /** จ่ายบางส่วน (มียอดจ่ายแต่ยังไม่ครบ) */
  partialCount: number;
};

export type PayrollExportBatch = {
  id: string;
  exportedAt: string;
  exportedByName?: string | null;
  rowCount: number;
  totalAmount: number;
};

/** พนักงานที่มียอดต้องจ่ายแต่ข้อมูลบัญชีธนาคารไม่ครบ (จากข้อมูลพนักงานปัจจุบัน) */
export type PayrollIncompleteEmployee = {
  userId: string;
  employeeCode?: string | null;
  displayName: string;
  missing: Array<"BANK_NAME" | "BANK_ACCOUNT_NO">;
};

export type PayrollRunDetail = PayrollRun & {
  slips: PayrollSlip[];
  exclusions: PayrollExclusion[];
  events: PayrollEvent[];
  payments: PayrollPayment[];
  paymentSummary: PayrollPaymentSummary;
  exportBatches: PayrollExportBatch[];
  /** เฉพาะงวดที่ยังไม่จ่าย (ร่าง/รออนุมัติ/รอจ่ายเงิน) — งวดอื่นเป็น [] */
  incompleteEmployees: PayrollIncompleteEmployee[];
};

/** งวดที่ช่วงวันทับกับงวดที่กำลังสร้าง (409 PAYROLL_PERIOD_OVERLAP / _FINALIZED) */
export type PayrollOverlapRun = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollRunStatus;
};

export type PayrollCheckItem = {
  code: string;
  message: string;
  userId?: string;
  displayName?: string;
};

export type PayrollCheckResult = {
  ok: boolean;
  requiresAcknowledgement: boolean;
  errors: PayrollCheckItem[];
  warnings: PayrollCheckItem[];
};

export type PayrollCheckApiResponse = { statusCode?: number; message: string; data: PayrollCheckResult };

export type PayrollPaymentMethod = "BANK_TRANSFER" | "CASH" | "CHEQUE" | "OTHER";

export type PayrollPaymentInput = {
  userId: string;
  status: "SUCCESS" | "FAILED";
  /** ยอดจ่ายรวมจริง (สะสม) — ไม่ส่ง = เต็มยอด · น้อยกว่ายอดที่ต้องจ่าย = จ่ายบางส่วน */
  amountPaid?: number;
  paidDate?: string;
  method?: PayrollPaymentMethod;
  referenceNo?: string;
  note?: string;
};

export type BulkPayrollPaymentsRequest = {
  /** ไม่ส่ง = ทุกคนที่ยังไม่จ่ายสำเร็จ */
  userIds?: string[];
  status: "SUCCESS" | "FAILED";
  paidDate?: string;
  method?: PayrollPaymentMethod;
  referenceNo?: string;
  note?: string;
};

export type PayrollPaymentExportRow = {
  userId: string;
  employeeCode?: string | null;
  displayName: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName?: string | null;
  amount: number;
};

export type PayrollPaymentExport = {
  runId: string;
  runName: string;
  periodStart: string;
  periodEnd: string;
  exportedAt: string;
  rows: PayrollPaymentExportRow[];
  totalAmount: number;
};

export type PayrollPaymentExportApiResponse = { statusCode?: number; message: string; data: PayrollPaymentExport };

export type CreatePayrollRunRequest = {
  name: string;
  periodStart: string;
  periodEnd: string;
  note?: string;
  exclusions?: PayrollExclusionInput[];
  /** ยืนยันสร้างซ้อนกับงวดที่ยังไม่ปิด (ทับงวดที่ปิดแล้วไม่ได้เสมอ) */
  allowOverlap?: boolean;
};

export type PayrollAdjustmentInput = {
  kind: PayrollAdjustmentKind;
  label: string;
  amount: number;
};

export type TaxBracket = { upTo: number | null; ratePercent: number };

export type PayrollSettings = {
  daysPerMonth: number;
  socialSecurityRatePercent: number;
  socialSecurityMaxBase: number;
  socialSecurityMinBase: number;
  unpaidLeaveTypes: string[];
  payHolidaysForDaily: boolean;
  taxEnabled: boolean;
  taxExpenseRatePercent: number;
  taxExpenseCap: number;
  taxPersonalAllowance: number;
  taxBrackets: TaxBracket[];
  providentFundEmployerPercent: number;
  providentFundMaxPercent: number;
  providentFundOptions: number[];
  /** แยกหน้าที่: ผู้ส่งอนุมัติ ≠ ผู้อนุมัติ ≠ ผู้บันทึกจ่าย (ค่าเริ่มต้นเปิด) */
  enforceSegregation?: boolean;
  /** ตรวจยอดผิดปกติก่อนส่งอนุมัติ: สุทธิ > ค่าจ้างปกติ × ตัวคูณ (0 = ปิด) */
  anomalyMultiplier?: number;
};

export type PayrollRunListApiResponse = {
  statusCode?: number;
  message: string;
  data: PayrollRun[];
};

export type PayrollRunApiResponse = {
  statusCode?: number;
  message: string;
  data: PayrollRunDetail;
};

export type PayrollSettingsApiResponse = {
  statusCode?: number;
  message: string;
  data: PayrollSettings;
};

export const PAYROLL_STATUS_LABEL: Record<PayrollRunStatus, string> = {
  DRAFT: STANDARD_STATUS.DRAFT.th,
  PENDING_APPROVAL: STANDARD_STATUS.PENDING_APPROVAL.th,
  PENDING_PAYMENT: "รอจ่ายเงิน",
  PAID: "จ่ายเงินแล้ว",
  FINALIZED: "ปิดงวดแล้ว",
  CANCELLED: STANDARD_STATUS.CANCELLED.th,
};

/** สี Tag ของสถานะงวด (ใช้ร่วมทั้งหน้ารายการและหน้ารายละเอียด) */
export const PAYROLL_STATUS_COLOR: Record<PayrollRunStatus, string> = {
  DRAFT: standardStatusColor("DRAFT"),
  PENDING_APPROVAL: standardStatusColor("PENDING_APPROVAL"),
  PENDING_PAYMENT: "blue",
  PAID: "cyan",
  FINALIZED: "green",
  CANCELLED: standardStatusColor("CANCELLED"),
};

/** รายการงวดที่ล็อกแล้ว แก้ยอด/รายการปรับ/คำนวณใหม่ไม่ได้ (ทุกสถานะที่ไม่ใช่ร่าง) */
export const isPayrollLocked = (status: PayrollRunStatus) => status !== "DRAFT";

export const LEAVE_TYPE_OPTIONS = [
  { value: "ANNUAL", label: "ลาพักร้อน" },
  { value: "SICK", label: "ลาป่วย" },
  { value: "PERSONAL", label: "ลากิจ" },
  { value: "MATERNITY", label: "ลาคลอด" },
  { value: "OTHER", label: "อื่น ๆ" },
];

export type WithholdingPayment = {
  paymentDate: string;
  runName: string;
  income: number;
  withholdingTax: number;
  socialSecurity: number;
  providentFund: number;
};

export type WithholdingCertificate = {
  userId: string;
  employeeCode?: string | null;
  displayName: string;
  position?: string | null;
  nationalId?: string | null;
  address?: string | null;
  totalIncome: number;
  totalWithholdingTax: number;
  totalSocialSecurity: number;
  totalProvidentFund: number;
  payments: WithholdingPayment[];
};

export type WithholdingCertificates = {
  year: number;
  items: WithholdingCertificate[];
};

export type SalaryCertificateEmployee = {
  userId: string;
  employeeCode?: string | null;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  position?: string | null;
  departmentName?: string | null;
  sectionName?: string | null;
  hireDate?: string | null;
  nationalId?: string | null;
  payType: "MONTHLY" | "DAILY";
  /** รายเดือน = เงินเดือน · รายวัน = ค่าแรงต่อวัน */
  basePay: number;
};

export type SalaryCertificateEmployeesApiResponse = {
  success?: boolean;
  message: string;
  data: { items: SalaryCertificateEmployee[] };
};

export type WithholdingCertificatesApiResponse = {
  success?: boolean;
  message: string;
  data: WithholdingCertificates;
};

/** ป้ายสถานะงวดตามภาษา — ไทยใช้ PAYROLL_STATUS_LABEL เดิม (คีย์ "ยกเลิก" ชนกับปุ่ม Cancel จึงไม่ผ่าน dictionary) */
export function payrollStatusLabel(status: PayrollRunStatus, lang: "th" | "en"): string {
  if (lang === "en") {
    return {
      DRAFT: standardStatusLabel("DRAFT", "en"),
      PENDING_APPROVAL: standardStatusLabel("PENDING_APPROVAL", "en"),
      PENDING_PAYMENT: "Awaiting payment",
      PAID: "Paid",
      FINALIZED: "Finalized",
      CANCELLED: standardStatusLabel("CANCELLED", "en"),
    }[status];
  }
  return PAYROLL_STATUS_LABEL[status];
}
