type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT";

export const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  PRESENT: "ปกติ",
  LATE: "สาย",
  ABSENT: "ขาดงาน",
};

export const ATTENDANCE_SOURCE_LABEL: Record<string, string> = {
  SELF: "พนักงานกดเอง",
  MANUAL: "บันทึกให้",
};

export type AttendanceRecord = {
  id: string;
  userId: string;
  employeeCode?: string;
  displayName?: string;
  departmentName?: string;
  attendanceDate: string;
  checkInAt?: string;
  checkOutAt?: string;
  status: string;
  remark?: string;
  source?: string;
  checkInIp?: string;
  checkOutIp?: string;
  workHours?: number;
};

export type MyAttendanceStatus = {
  today: string;
  serverTime: string;
  displayName: string;
  employeeCode?: string;
  departmentName?: string;
  canCheckIn: boolean;
  canCheckOut: boolean;
  /** IP ปัจจุบันอยู่ในรายการที่อนุญาตหรือไม่ */
  ipAllowed: boolean;
  /** true = ระบบตั้งค่าจำกัด IP ไว้ (ตั้งที่ ATTENDANCE_ALLOWED_IPS) */
  ipRestricted: boolean;
  clientIp: string;
  workStartTime: string;
  /** มีค่าเมื่อมีกะของวันก่อนหน้าที่ยังไม่กดออกงาน (กะข้ามเที่ยงคืน) */
  pendingCheckOutDate?: string;
  pendingCheckInAt?: string;
  record?: AttendanceRecord;
};

export type AttendanceDailyPoint = {
  date: string;
  present: number;
  late: number;
  total: number;
  avgWorkHours: number;
};

export type AttendanceUserSummary = {
  userId: string;
  employeeCode?: string;
  displayName?: string;
  days: number;
  lateDays: number;
  totalWorkHours: number;
};

export type AttendanceSummary = {
  dateFrom: string;
  dateTo: string;
  totalRecords: number;
  totalEmployees: number;
  presentCount: number;
  lateCount: number;
  checkedOutCount: number;
  missingCheckOutCount: number;
  avgWorkHours: number;
  daily: AttendanceDailyPoint[];
  byUser: AttendanceUserSummary[];
};

export type AttendanceQueryParams = {
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  status?: string;
};

export type AttendanceSummaryParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type AttendanceRecordApiResponse = ApiEnvelope<AttendanceRecord>;
export type AttendanceRecordListApiResponse = ApiEnvelope<AttendanceRecord[]>;
export type MyAttendanceStatusApiResponse = ApiEnvelope<MyAttendanceStatus>;
export type AttendanceSummaryApiResponse = ApiEnvelope<AttendanceSummary>;
