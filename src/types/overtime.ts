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
};

export type OvertimeSummary = {
  dateFrom: string;
  dateTo: string;
  /** คิวรออนุมัติทั้งหมด ไม่ผูกช่วงวันที่ */
  pendingCount: number;
  pendingHours: number;
  approvedCount: number;
  approvedHours: number;
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
