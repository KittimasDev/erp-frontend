type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

/** DRAFT = รออนุมัติ (ชื่อสถานะฝั่ง DB — UI แสดงเป็น "รออนุมัติ") */
export type OvertimeStatus =
  | "DRAFT"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export const OVERTIME_STATUS_LABEL: Record<string, string> = {
  DRAFT: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  CANCELLED: "ยกเลิก",
};

export const OVERTIME_STATUS_COLOR: Record<string, string> = {
  DRAFT: "processing",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
};

export const OVERTIME_SOURCE_LABEL: Record<string, string> = {
  SELF: "พนักงานขอเอง",
  MANUAL: "บันทึกให้",
};

/** ประเภทวันที่ใช้คิดเงิน OT — ตัดสินตอนอนุมัติ */
export type OtDayType = "NORMAL" | "HOLIDAY" | "SHUTDOWN";

export const OT_DAY_TYPE_LABEL: Record<string, string> = {
  NORMAL: "วันปกติ",
  HOLIDAY: "วันหยุด",
  SHUTDOWN: "ช่วง Shutdown",
};

export type OvertimeCalcLine = {
  label: string;
  hours: number;
  multiplier: number;
  amount: number;
};

export type OvertimeCalcDetail = {
  payType: string;
  lines: OvertimeCalcLine[];
  /** เหตุที่คิดเงินไม่ได้ เช่น ไม่มีฐานค่าจ้าง */
  note?: string;
};

/** ตัวคูณและสูตรค่าแรงต่อชั่วโมง — ค่าเริ่มต้นตามกฎหมายคุ้มครองแรงงาน */
export type OtSettings = {
  daysPerMonth: number;
  hoursPerDay: number;
  normalMultiplier: number;
  holidayWorkMonthlyMultiplier: number;
  holidayWorkDailyMultiplier: number;
  holidayOtMultiplier: number;
  shutdownWorkMonthlyMultiplier: number;
  shutdownWorkDailyMultiplier: number;
  shutdownOtMultiplier: number;
};

export type OtSettingsApiResponse = ApiEnvelope<OtSettings>;

export type OvertimeRequest = {
  id: string;
  userId: string;
  employeeCode?: string;
  displayName?: string;
  departmentName?: string;
  otDate: string;
  /** decimal string จาก backend เช่น "3.00" */
  hours: string;
  reason: string;
  status: string;
  source?: string;
  requestedById?: string;
  requestedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  reviewRemark?: string;
  /** ฟิลด์เงินมีเฉพาะฝั่งฝ่ายบุคคล และเฉพาะคำขอที่อนุมัติแล้ว (หน้าพนักงานไม่ได้รับ) */
  dayType?: string;
  hourlyRate?: number | null;
  /** null = อนุมัติแล้วแต่คิดเงินไม่ได้ (ไม่มีฐานค่าจ้าง) */
  otAmount?: number | null;
  calcDetail?: OvertimeCalcDetail;
  createdAt: string;
};

export type OvertimeDailyPoint = {
  date: string;
  approvedHours: number;
  pendingHours: number;
};

export type OvertimeUserSummary = {
  userId: string;
  employeeCode?: string;
  displayName?: string;
  requests: number;
  approvedHours: number;
  approvedAmount: number;
};

export type OvertimeSummary = {
  dateFrom: string;
  dateTo: string;
  /** คิวรออนุมัติทั้งหมด ไม่ผูกช่วงวันที่ */
  pendingCount: number;
  pendingHours: number;
  approvedCount: number;
  approvedHours: number;
  /** ยอดเงิน OT ที่อนุมัติแล้วในช่วง (เฉพาะคำขอที่คิดเงินได้) */
  approvedAmount: number;
  /** อนุมัติแล้วแต่คิดเงินไม่ได้ (ไม่มีฐานค่าจ้าง) */
  unpricedCount: number;
  rejectedCount: number;
  cancelledCount: number;
  daily: OvertimeDailyPoint[];
  byUser: OvertimeUserSummary[];
};

export type OvertimeQueryParams = {
  status?: string;
  userId?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type OvertimeSummaryParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type CreateMyOvertimeRequest = {
  otDate: string;
  hours: number;
  reason: string;
};

export type OvertimeRequestApiResponse = ApiEnvelope<OvertimeRequest>;
export type OvertimeRequestListApiResponse = ApiEnvelope<OvertimeRequest[]>;
export type OvertimeSummaryApiResponse = ApiEnvelope<OvertimeSummary>;

/** ป้ายสถานะคำขอ OT ตามภาษา — คีย์ "ปฏิเสธ"/"ยกเลิก" ชนกับปุ่ม Reject/Cancel จึงไม่ผ่าน dictionary */
export function overtimeStatusLabel(status: string, lang: "th" | "en"): string {
  if (lang === "en") {
    const en: Record<string, string> = {
      DRAFT: "Pending approval",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      CANCELLED: "Cancelled",
    };
    return en[status] ?? status;
  }
  return OVERTIME_STATUS_LABEL[status] ?? status;
}
