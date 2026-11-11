import { STANDARD_STATUS, standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";

type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export type LeaveType = "ANNUAL" | "SICK" | "PERSONAL" | "MATERNITY" | "OTHER";

/** ลาคลอดยื่นได้ไม่เกิน 120 วันต่อคำขอ (กฎหมายคุ้มครองแรงงาน) — backend ตรวจ */
export const MATERNITY_MAX_DAYS = 120;

export const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: "ลาพักร้อน",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  MATERNITY: "ลาคลอด",
  OTHER: "อื่นๆ",
};

export const LEAVE_TYPE_COLOR: Record<string, string> = {
  ANNUAL: "green",
  SICK: "volcano",
  PERSONAL: "blue",
  MATERNITY: "magenta",
  OTHER: "default",
};

export const LEAVE_TYPE_OPTIONS = (
  ["ANNUAL", "SICK", "PERSONAL", "MATERNITY", "OTHER"] as const
).map((value) => ({ value, label: LEAVE_TYPE_LABEL[value] }));

/** DRAFT = รออนุมัติ (ชื่อสถานะฝั่ง DB — UI แสดงเป็น "รออนุมัติ") */
export type LeaveStatus = "DRAFT" | "APPROVED" | "REJECTED" | "CANCELLED";

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  DRAFT: STANDARD_STATUS.PENDING_APPROVAL.th,
  APPROVED: STANDARD_STATUS.APPROVED.th,
  REJECTED: STANDARD_STATUS.REJECTED.th,
  CANCELLED: STANDARD_STATUS.CANCELLED.th,
};

export const LEAVE_STATUS_COLOR: Record<string, string> = {
  DRAFT: standardStatusColor("PENDING_APPROVAL"),
  APPROVED: standardStatusColor("APPROVED"),
  REJECTED: standardStatusColor("REJECTED"),
  CANCELLED: standardStatusColor("CANCELLED"),
};

export const LEAVE_SOURCE_LABEL: Record<string, string> = {
  SELF: "พนักงานยื่นเอง",
  MANUAL: "บันทึกให้",
};

export type LeaveRequest = {
  id: string;
  userId: string;
  employeeCode?: string;
  displayName?: string;
  departmentName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  /** นับรวมวันเริ่มและวันจบ */
  days: number;
  reason: string;
  status: string;
  source?: string;
  requestedById?: string;
  requestedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  reviewRemark?: string;
  /** กะที่กำลังคนต่ำกว่าขั้นต่ำ ณ วันอนุมัติ (ผู้อนุมัติรับทราบแล้ว) */
  staffingWarning?: StaffingShortfall[];
  createdAt: string;
};

/** กะ (วัน × ตำแหน่ง × กะ) ที่อนุมัติลาแล้วคนจะเหลือน้อยกว่าขั้นต่ำ */
export type StaffingShortfall = {
  date: string;
  shiftId: string;
  shiftName: string;
  position: string;
  minHeadcount: number;
  /** เหลือกี่คนหลังหักคนลา (ไม่รวมผู้ขอลานี้) */
  remaining: number;
};

export type StaffingCheck = {
  checked: boolean;
  shortfalls: StaffingShortfall[];
  /** ข้อความอ่านง่ายต่อรายการ */
  messages: string[];
};

export type StaffingCheckApiResponse = ApiEnvelope<StaffingCheck>;

export type MinStaffingItem = {
  position: string;
  shiftId: string;
  minHeadcount: number;
};

export type MinStaffingRow = MinStaffingItem & { shiftName: string };

export type MinStaffingListApiResponse = ApiEnvelope<MinStaffingRow[]>;

export type LeaveTypeSummary = {
  leaveType: string;
  requests: number;
  days: number;
};

export type LeaveUserSummary = {
  userId: string;
  employeeCode?: string;
  displayName?: string;
  requests: number;
  approvedDays: number;
};

export type LeaveSummary = {
  dateFrom: string;
  dateTo: string;
  /** คิวรออนุมัติทั้งหมด ไม่ผูกช่วงวันที่ */
  pendingCount: number;
  pendingDays: number;
  approvedCount: number;
  approvedDays: number;
  rejectedCount: number;
  cancelledCount: number;
  /** จำนวนคนที่ลาอยู่ ณ วันนี้ */
  onLeaveToday: number;
  byType: LeaveTypeSummary[];
  byUser: LeaveUserSummary[];
};

export type LeaveQueryParams = {
  status?: string;
  leaveType?: string;
  userId?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type LeaveSummaryParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type CreateMyLeaveRequest = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
};

export type LeaveRequestApiResponse = ApiEnvelope<LeaveRequest>;
export type LeaveRequestListApiResponse = ApiEnvelope<LeaveRequest[]>;
export type LeaveSummaryApiResponse = ApiEnvelope<LeaveSummary>;

/** ป้ายสถานะคำขอลาตามภาษา — คีย์ "ปฏิเสธ"/"ยกเลิก" ชนกับปุ่ม Reject/Cancel จึงไม่ผ่าน dictionary */
export function leaveStatusLabel(status: string, lang: "th" | "en"): string {
  if (lang === "en") {
    const en: Record<string, string> = {
      DRAFT: standardStatusLabel("PENDING_APPROVAL", "en"),
      APPROVED: standardStatusLabel("APPROVED", "en"),
      REJECTED: standardStatusLabel("REJECTED", "en"),
      CANCELLED: standardStatusLabel("CANCELLED", "en"),
    };
    return en[status] ?? status;
  }
  return LEAVE_STATUS_LABEL[status] ?? status;
}
