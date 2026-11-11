import type { PayrollSlip } from "@/types/payroll";

export type SlipStatusFilter =
  | "ALL"
  | "WARNING"
  | "NEGATIVE"
  | "ZERO_NET"
  | "NO_BASE"
  | "HAS_OT"
  | "HAS_ADJUSTMENT"
  | "HAS_ABSENCE";

export const SLIP_STATUS_OPTIONS: Array<{ value: SlipStatusFilter; label: string }> = [
  { value: "ALL", label: "ทุกสถานะ" },
  { value: "WARNING", label: "มีคำเตือน" },
  { value: "NEGATIVE", label: "สุทธิติดลบ" },
  { value: "ZERO_NET", label: "สุทธิเป็น 0" },
  { value: "NO_BASE", label: "ไม่มีฐานค่าจ้าง" },
  { value: "HAS_OT", label: "มี OT" },
  { value: "HAS_ADJUSTMENT", label: "มีรายการปรับ" },
  { value: "HAS_ABSENCE", label: "มีหักขาด/ลาไม่รับเงิน" },
];

export type Range = { min?: number | null; max?: number | null };

export type SlipFilter = {
  keyword: string;
  payType: "ALL" | "MONTHLY" | "DAILY";
  status: SlipStatusFilter;
  department: string; // "" = ทุกแผนก
  basePay: Range;
  otAmount: Range;
  netPay: Range;
};

export const EMPTY_SLIP_FILTER: SlipFilter = {
  keyword: "",
  payType: "ALL",
  status: "ALL",
  department: "",
  basePay: {},
  otAmount: {},
  netPay: {},
};

export function isSlipFilterActive(f: SlipFilter): boolean {
  const hasRange = (r: Range) => r.min != null || r.max != null;
  return (
    f.keyword.trim() !== "" ||
    f.payType !== "ALL" ||
    f.status !== "ALL" ||
    f.department !== "" ||
    hasRange(f.basePay) ||
    hasRange(f.otAmount) ||
    hasRange(f.netPay)
  );
}

const inRange = (value: number, r: Range) =>
  (r.min == null || value >= r.min) && (r.max == null || value <= r.max);

function matchStatus(s: PayrollSlip, status: SlipStatusFilter): boolean {
  switch (status) {
    case "WARNING":
      return s.warnings.length > 0;
    case "NEGATIVE":
      return s.netPay < 0;
    case "ZERO_NET":
      return s.netPay === 0;
    case "NO_BASE":
      return !(s.basePay > 0);
    case "HAS_OT":
      return s.otAmount > 0 || s.otHours > 0;
    case "HAS_ADJUSTMENT":
      return s.adjustments.length > 0;
    case "HAS_ABSENCE":
      return s.absenceDeduction > 0;
    default:
      return true;
  }
}

/** กรองสลิปฝั่งหน้าจอ — ค้นหา ชื่อ/รหัส/ตำแหน่ง/แผนก ไม่สนตัวพิมพ์ */
export function filterSlips(slips: PayrollSlip[], f: SlipFilter): PayrollSlip[] {
  const kw = f.keyword.trim().toLowerCase();
  return slips.filter((s) => {
    if (kw) {
      const hay = [s.displayName, s.employeeCode, s.position, s.departmentName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    if (f.payType !== "ALL" && s.payType !== f.payType) return false;
    if (f.department && (s.departmentName ?? "") !== f.department) return false;
    if (!matchStatus(s, f.status)) return false;
    return inRange(s.basePay, f.basePay) && inRange(s.otAmount, f.otAmount) && inRange(s.netPay, f.netPay);
  });
}
