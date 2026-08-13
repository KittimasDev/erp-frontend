type ApiEnvelope<T> = {
  statusCode: number;
  message: string;
  data: T;
};

/* ---------- กะมาตรฐาน (master) ---------- */

export type Shift = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color?: string;
  lateGraceMinutes?: number;
  /** true = กะข้ามเที่ยงคืน (เลิกกะวันถัดไป) */
  isOvernight: boolean;
  isActive: boolean;
};

export type CreateShiftRequest = {
  name: string;
  startTime: string;
  endTime: string;
  color?: string;
  lateGraceMinutes?: number;
};

export type UpdateShiftRequest = {
  name?: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  lateGraceMinutes?: number;
  isActive?: boolean;
};

/* ---------- รอบกะรายวันบนปฏิทิน ---------- */

export type ShiftScheduleMember = {
  id: string;
  userId: string;
  employeeCode?: string;
  displayName?: string;
  departmentName?: string;
};

export type ShiftSchedule = {
  id: string;
  shiftDate: string;
  shiftId: string;
  shiftName: string;
  color?: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  note?: string;
  memberCount: number;
  /** มีค่าเมื่อเรียกรายละเอียดรอบกะ */
  members?: ShiftScheduleMember[];
};

export type CreateShiftScheduleRequest = {
  shiftDate: string;
  shiftId: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  userIds?: string[];
};

export type UpdateShiftScheduleRequest = {
  /** ย้ายรอบกะไปวันอื่น — รายชื่อคนในรอบย้ายไปด้วยทั้งชุด */
  shiftDate?: string;
  /** สลับเป็นกะอื่นทั้งรอบ */
  shiftId?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
};

export type BulkCreateShiftSchedulesRequest = {
  dateFrom: string;
  dateTo: string;
  shiftId: string;
  startTime?: string;
  endTime?: string;
  weekdays?: number[];
  skipHolidays?: boolean;
  userIds?: string[];
  note?: string;
};

export type BulkShiftScheduleResult = {
  created: number;
  updated: number;
  skippedDates: string[];
  conflictDates: string[];
};

/* ---------- วันหยุด / วันซ่อมเครื่อง ---------- */

export type WorkCalendarDayType = "HOLIDAY" | "MAINTENANCE";

export const WORK_CALENDAR_DAY_TYPE_LABEL: Record<string, string> = {
  HOLIDAY: "วันหยุด",
  MAINTENANCE: "หยุดซ่อมเครื่อง",
};

export const WORK_CALENDAR_DAY_TYPE_OPTIONS = [
  { value: "MAINTENANCE", label: "หยุดซ่อมเครื่อง" },
  { value: "HOLIDAY", label: "วันหยุดบริษัท" },
];

export type WorkCalendarDay = {
  id: string;
  date: string;
  dayType: string;
  name: string;
  note?: string;
};

export type CreateWorkCalendarDayRequest = {
  date: string;
  dayType?: string;
  name: string;
  note?: string;
};

/* ---------- ปฏิทินรวม ---------- */

export type ShiftCalendarDay = {
  date: string;
  holiday?: WorkCalendarDay;
  schedules: ShiftSchedule[];
  totalMembers: number;
};

export type ShiftCalendar = {
  dateFrom: string;
  dateTo: string;
  days: ShiftCalendarDay[];
};

export type ShiftCalendarParams = {
  dateFrom: string;
  dateTo: string;
};

/* ---------- รายการเข้ากะ (ใครเข้ากะวันไหน) ---------- */

/** 1 แถว = พนักงาน 1 คน เข้ากะ 1 รอบ ของ 1 วัน */
export type ShiftAssignment = {
  date: string;
  scheduleId: string;
  userId: string;
  employeeCode?: string;
  displayName?: string;
  departmentName?: string;
  shiftId: string;
  shiftName: string;
  color?: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  /** true = วันนั้นถูกกดหยุดไว้ (ยังขึ้นในตารางกะแต่ไม่คิดสาย) */
  isHoliday: boolean;
  holidayName?: string;
  note?: string;
};

export type ShiftAssignmentUserShift = {
  shiftId: string;
  shiftName: string;
  color?: string;
  days: number;
};

export type ShiftAssignmentUser = {
  userId: string;
  employeeCode?: string;
  displayName?: string;
  departmentName?: string;
  totalDays: number;
  holidayDays: number;
  firstDate?: string;
  lastDate?: string;
  shifts: ShiftAssignmentUserShift[];
};

export type ShiftAssignmentList = {
  dateFrom: string;
  dateTo: string;
  totalAssignments: number;
  totalEmployees: number;
  rows: ShiftAssignment[];
  byUser: ShiftAssignmentUser[];
};

export type ShiftAssignmentParams = {
  dateFrom: string;
  dateTo: string;
  shiftId?: string;
  userId?: string;
  q?: string;
};

/* ---------- กะของพนักงาน ---------- */

/** ที่มาของกะที่พนักงานเห็นในวันนั้น */
export type ShiftSource = "ROSTER" | "STANDING" | "DEFAULT" | "HOLIDAY";

export const SHIFT_SOURCE_LABEL: Record<string, string> = {
  ROSTER: "ฝ่ายบุคคลจัดกะไว้",
  STANDING: "กะประจำ",
  DEFAULT: "ยังไม่ได้จัดกะ",
  HOLIDAY: "วันหยุด",
};

export type MyShiftDay = {
  date: string;
  source: string;
  isHoliday: boolean;
  holidayName?: string;
  holidayType?: string;
  scheduleId?: string;
  shiftName?: string;
  startTime?: string;
  endTime?: string;
  isOvernight?: boolean;
  lateGraceMinutes?: number;
  note?: string;
};

export type MyShiftSchedule = {
  today: MyShiftDay;
  tomorrow: MyShiftDay;
  days: MyShiftDay[];
};

/* ---------- envelopes ---------- */

export type ShiftListApiResponse = ApiEnvelope<Shift[]>;
export type ShiftApiResponse = ApiEnvelope<Shift>;
export type ShiftScheduleApiResponse = ApiEnvelope<ShiftSchedule>;
export type ShiftCalendarApiResponse = ApiEnvelope<ShiftCalendar>;
export type ShiftAssignmentListApiResponse = ApiEnvelope<ShiftAssignmentList>;
export type BulkShiftScheduleApiResponse = ApiEnvelope<BulkShiftScheduleResult>;
export type WorkCalendarDayApiResponse = ApiEnvelope<WorkCalendarDay>;
export type WorkCalendarDayListApiResponse = ApiEnvelope<WorkCalendarDay[]>;
export type MyShiftScheduleApiResponse = ApiEnvelope<MyShiftSchedule>;
