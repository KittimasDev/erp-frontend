/** เงินเดือน (HRM_PAYROLL) — ตรงกับ backend hrm/dto/payroll.dto.ts */
export type PayrollRunStatus = "DRAFT" | "FINALIZED" | "CANCELLED";

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
  totals: PayrollTotals;
  createdAt: string;
};

export type PayrollRunDetail = PayrollRun & { slips: PayrollSlip[] };

export type CreatePayrollRunRequest = {
  name: string;
  periodStart: string;
  periodEnd: string;
  note?: string;
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
  DRAFT: "ร่าง",
  FINALIZED: "ปิดงวดแล้ว",
  CANCELLED: "ยกเลิก",
};

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
  position?: string | null;
  departmentName?: string | null;
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
