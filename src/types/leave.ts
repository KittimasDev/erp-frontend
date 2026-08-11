type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export type LeaveType = "ANNUAL" | "SICK" | "PERSONAL" | "OTHER";

export const LEAVE_TYPE_LABEL: Record<string, string> = {
  ANNUAL: "ลาพักร้อน",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  OTHER: "อื่นๆ",
};

export const LEAVE_TYPE_COLOR: Record<string, string> = {
  ANNUAL: "green",
  SICK: "volcano",
  PERSONAL: "blue",
  OTHER: "default",
};

export const LEAVE_TYPE_OPTIONS = (
  ["ANNUAL", "SICK", "PERSONAL", "OTHER"] as const
).map((value) => ({ value, label: LEAVE_TYPE_LABEL[value] }));

/** DRAFT = รออนุมัติ (ชื่อสถานะฝั่ง DB — UI แสดงเป็น "รออนุมัติ") */
export type LeaveStatus = "DRAFT" | "APPROVED" | "REJECTED" | "CANCELLED";

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  CANCELLED: "ยกเลิก",
};

export const LEAVE_STATUS_COLOR: Record<string, string> = {
  DRAFT: "processing",
  APPROVED: "success",
  REJECTED: "error",
  CANCELLED: "default",
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
  createdAt: string;
};

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
