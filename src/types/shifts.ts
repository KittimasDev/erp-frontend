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

/** ใบลาที่คร่อมวันของแถวกะ */
export type ShiftAssignmentLeave = {
  id: string;
  leaveType: string;
  /** DRAFT = รออนุมัติ */
  status: string;
  startDate: string;
  endDate: string;
  reason?: string;
};

/** ใบ OT ของวันนั้น */
export type ShiftAssignmentOvertime = {
  id: string;
  hours: number;
  status: string;
  reason?: string;
};

/** 1 แถว = พนักงาน 1 คน เข้ากะ 1 รอบ ของ 1 วัน */
export type ShiftAssignment = {
  date: string;
  scheduleId: string;
  userId: string;
  employeeCode?: string;
  displayName?: string;
  position?: string;
  departmentId?: string;
  departmentName?: string;
  shiftId: string;
  shiftName: string;
  color?: string;
  startTime: string;
  endTime: string;
  isOvernight: boolean;
  /** ความยาวกะเป็นนาที (ยังไม่หักเวลาพัก) */
  workMinutes: number;
  /** สายได้ไม่เกินกี่นาทีตามกะมาตรฐาน */
  lateGraceMinutes?: number;
  /** 0 = อาทิตย์ */
  weekday: number;
  /** true = วันนั้นถูกกดหยุดไว้ (ยังขึ้นในตารางกะแต่ไม่คิดสาย) */
  isHoliday: boolean;
  holidayName?: string;
  note?: string;
  /** มีค่าเมื่อคนนี้ยื่นลาคร่อมวันนี้ (รออนุมัติหรืออนุมัติแล้ว) */
  leave?: ShiftAssignmentLeave;
  /** มีค่าเมื่อคนนี้ขอ OT ในวันนี้ */
  overtime?: ShiftAssignmentOvertime;
  /** true = ลาที่อนุมัติแล้วทับวันนี้ — กะยังอยู่แต่คนไม่มา */
  isOnLeave: boolean;
};

/** ใบลา/OT รายวันในช่วงที่เลือก — รวมวันที่ไม่ได้ถูกจัดกะ */
export type ShiftAssignmentEvent = {
  kind: "LEAVE" | "OVERTIME";
  id: string;
  date: string;
  /** 0 = อาทิตย์ */
  weekday: number;
  userId: string;
  employeeCode?: string;
  displayName?: string;
  position?: string;
  departmentId?: string;
  departmentName?: string;
  /** DRAFT = รออนุมัติ */
  status: string;
  /** เฉพาะ kind = LEAVE */
  leaveType?: string;
  /** เฉพาะ kind = OVERTIME */
  hours?: number;
  reason?: string;
  /** true = วันนั้นถูกจัดกะไว้ด้วย — ลา/OT ทับกะจริง */
  hasShift: boolean;
  shiftName?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  color?: string;
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
  position?: string;
  departmentId?: string;
  departmentName?: string;
  totalDays: number;
  holidayDays: number;
  overnightDays: number;
  /** วันที่ถูกจัดกะแต่ลาที่อนุมัติแล้วทับ — กะขาดคนจริง */
  leaveDays: number;
  /** วันที่ถูกจัดกะแล้วมีใบลารออนุมัติทับอยู่ */
  pendingLeaveDays: number;
  /** ชั่วโมง OT ที่อนุมัติแล้วในวันที่ถูกจัดกะ */
  overtimeHours: number;
  /** ชั่วโมงกะรวมของคนนี้ (นาที) */
  workMinutes: number;
  firstDate?: string;
  lastDate?: string;
  shifts: ShiftAssignmentUserShift[];
};

/** ยอดรวมรายกะของทั้งช่วง */
export type ShiftAssignmentShiftSummary = {
  shiftId: string;
  shiftName: string;
  color?: string;
  startTime: string;
  endTime: string;
  assignments: number;
  employees: number;
};

export type ShiftAssignmentList = {
  dateFrom: string;
  dateTo: string;
  totalAssignments: number;
  totalEmployees: number;
  /** ชั่วโมงกะรวมทั้งช่วง (นาที) */
  totalWorkMinutes: number;
  /** จำนวนวันที่มีคนเข้ากะจริง */
  workingDays: number;
  /** จำนวนวันทั้งหมดในช่วงที่เลือก */
  rangeDays: number;
  /** วันหยุด/หยุดซ่อมเครื่องที่ทับกับช่วงนี้ */
  holidayDays: number;
  /** จำนวนกะที่คนลา (อนุมัติแล้ว) — กะขาดคนเท่านี้ */
  shiftsOnLeave: number;
  /** จำนวนกะที่มีใบลารออนุมัติทับอยู่ */
  shiftsPendingLeave: number;
  /** ชั่วโมง OT ที่อนุมัติแล้วทั้งช่วง */
  totalOvertimeHours: number;
  /** จำนวนคนที่ลาในช่วงนี้ (อนุมัติแล้ว) ไม่ว่าจะถูกจัดกะหรือไม่ */
  employeesOnLeave: number;
  rows: ShiftAssignment[];
  byUser: ShiftAssignmentUser[];
  byShift: ShiftAssignmentShiftSummary[];
  events: ShiftAssignmentEvent[];
};

export type ShiftAssignmentParams = {
  dateFrom: string;
  dateTo: string;
  shiftId?: string;
  userId?: string;
  departmentId?: string;
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
