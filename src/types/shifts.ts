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

/** RUN = ปฏิบัติงานปกติ · SHUTDOWN = ช่วงสิ้นสุดรอบผลิต · EXTRA_OFF = หยุดผลิตเพิ่มเติม */
export type ShiftCalendarProductionDayType = "RUN" | "SHUTDOWN" | "EXTRA_OFF";

export type ShiftCalendarProductionDay = {
  dayType: ShiftCalendarProductionDayType;
  roundNo: string;
};

export type ShiftCalendarDay = {
  date: string;
  holiday?: WorkCalendarDay;
  /** ประเภทวันจากรอบการผลิตที่ยืนยันแล้ว — ไม่มี = ไม่อยู่ในรอบใด */
  productionDay?: ShiftCalendarProductionDay;
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
  /** ชั่วโมง OT ที่อนุมัติแล้วทั้งหมดในช่วง (รวมวันที่ไม่ได้ถูกจัดกะ) */
  overtimeHours: number;
  /** ส่วนของ overtimeHours ที่ตกวันที่ไม่ได้ถูกจัดกะ เช่น วันหยุดประจำสัปดาห์ */
  offShiftOvertimeHours: number;
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

/* ---------- ตารางกริด คน × วัน (ใครหยุดวันไหน) ---------- */

/**
 * OFF = วันนั้นจัดกะแล้วแต่ไม่มีชื่อเขา (หยุดจริง)
 * UNPLANNED = วันนั้นยังไม่มีรอบกะเลย (HR ยังจัดไม่เสร็จ ไม่ใช่หยุด)
 */
export type ShiftRosterStatus =
  | "SHIFT"
  | "LEAVE"
  | "HOLIDAY"
  | "OFF"
  | "UNPLANNED";

export const SHIFT_ROSTER_STATUS_LABEL: Record<ShiftRosterStatus, string> = {
  SHIFT: "เข้ากะ",
  LEAVE: "ลา",
  HOLIDAY: "วันหยุดบริษัท",
  OFF: "หยุด",
  UNPLANNED: "ยังไม่จัดกะ",
};

export type ShiftRosterDay = {
  date: string;
  weekday: number;
  isHoliday: boolean;
  holidayName?: string;
  holidayType?: string;
  hasRounds: boolean;
  workingCount: number;
  leaveCount: number;
  offCount: number;
};

export type ShiftRosterCell = {
  date: string;
  status: ShiftRosterStatus;
  shiftId?: string;
  shiftName?: string;
  color?: string;
  startTime?: string;
  endTime?: string;
  leaveType?: string;
  leaveStatus?: string;
  holidayName?: string;
};

export type ShiftRosterRow = {
  userId: string;
  employeeCode?: string;
  displayName: string;
  position?: string;
  departmentId?: string;
  departmentName?: string;
  cells: ShiftRosterCell[];
  workingDays: number;
  offDays: number;
  leaveDays: number;
  holidayDays: number;
  unplannedDays: number;
};

export type ShiftRoster = {
  dateFrom: string;
  dateTo: string;
  days: ShiftRosterDay[];
  rows: ShiftRosterRow[];
  totalEmployees: number;
  unplannedDays: number;
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

/* ---------- จัดตารางกะรายเดือนอัตโนมัติ ---------- */

export type ShiftAutoPlanDemand = {
  shiftId: string;
  headcount: number;
};

export type ShiftAutoPlanPositionInput = {
  position: string;
  /** ลำดับในอาร์เรย์ = ลำดับกะในหนึ่งวัน (เช้า → บ่าย → ดึก) */
  demands: ShiftAutoPlanDemand[];
  /** กำหนดลำดับพนักงานเอง (R1..Rn) — ไม่ส่ง = เรียงตามรหัสพนักงาน */
  userIds?: string[];
};

/** รอบวางกะ (ค่าเริ่มต้น 45 วัน) นับต่อเนื่องจากวันเริ่มรอบ */
export type ShiftCycleRange = {
  /** 0 = รอบที่เริ่มที่วันเริ่มรอบ · ติดลบ = ก่อนวันเริ่มรอบ */
  index: number;
  dateFrom: string;
  dateTo: string;
  lengthDays: number;
};

export type ShiftPlanCycle = {
  /** false = ยังไม่ได้ตั้งวันเริ่มรอบ */
  configured: boolean;
  cycleStartDate?: string | null;
  cycleLengthDays: number;
  today: string;
  current?: ShiftCycleRange | null;
  previous?: ShiftCycleRange | null;
  next?: ShiftCycleRange | null;
};

export type ShiftPlanCycleApiResponse = {
  statusCode?: number;
  message: string;
  data: ShiftPlanCycle;
};

export type UpdateShiftPlanCycleRequest = {
  cycleStartDate: string;
  cycleLengthDays: number;
};

/** RUN = ปฏิบัติงานปกติ (วันผลิต) · SHUTDOWN = ช่วงสิ้นสุดรอบผลิต */
export type ShiftAutoPlanProductionPhase = "RUN" | "SHUTDOWN";

export type ShiftAutoPlanRequest = {
  /** `YYYY-MM` — จัดทั้งเดือน (ถ้าส่ง dateFrom+dateTo มาด้วย ช่วงวันที่ชนะ) */
  month?: string;
  /** ช่วงที่จะจัด เช่น รอบ 45 วัน — ต้องส่งคู่กัน ยาวไม่เกิน 62 วัน */
  dateFrom?: string;
  dateTo?: string;
  /** จัดเฉพาะวันในเดือน (month) ที่ประเภทวันตรงกัน — ต้องส่งคู่กับ month · ไม่สนใจ skipHolidays */
  productionPhase?: ShiftAutoPlanProductionPhase;
  positions: ShiftAutoPlanPositionInput[];
  /** กรองเอาเฉพาะคนที่มีบทบาทเหล่านี้ — ไม่ส่ง = เอาทุกคน */
  roleIds?: string[];
  /** พนักงานที่ไม่ได้เปิด login จะไม่มีบทบาทติดตัว ติ๊กนี้เพื่อดึงกลับมา */
  includeEmployeesWithoutRole?: boolean;
  skipHolidays?: boolean;
  note?: string;
};

export type ShiftAutoPlanPositionsParams = {
  roleIds?: string[];
  includeEmployeesWithoutRole?: boolean;
};

export type ShiftAutoPlanRoleOption = {
  roleId: string;
  roleCode: string;
  roleName: string;
  isSystemRole: boolean;
  /** นับไม่ซ้ำคน (คนหนึ่งมีได้หลายบทบาท) */
  employeeCount: number;
};

export type ShiftAutoPlanRoleOptions = {
  roles: ShiftAutoPlanRoleOption[];
  /** พนักงาน active ที่ไม่มีบทบาทเลย — ปกติคือคนที่ไม่ได้เปิด login */
  employeesWithoutRoleCount: number;
  /** ไม่เท่ากับผลรวม employeeCount ของทุกบทบาท เพราะคนหนึ่งมีได้หลายบทบาท */
  activeEmployeeCount: number;
};

export type ShiftAutoPlanApplyRequest = ShiftAutoPlanRequest & {
  overwriteExisting?: boolean;
  forcePublish?: boolean;
};

export type ShiftAutoPlanPositionOption = {
  position: string;
  employeeCount: number;
};

export type ShiftAutoPlanRole = "MAIN" | "REFILL";

export type ShiftAutoPlanEmployee = {
  userId: string;
  employeeCode?: string;
  displayName: string;
  /** 0 = R1 */
  index: number;
  role: ShiftAutoPlanRole;
  /** มีเฉพาะคนหลัก = กะประจำทั้งเดือน */
  primaryShiftId?: string;
  primaryShiftName?: string;
  /** 0 = อาทิตย์ ... 6 = เสาร์ */
  dayOffWeekday: number;
  dayOffLabel: string;
  assignedDays: number;
  /** มากกว่า 1 = คนนี้สลับกะ */
  shiftIdsUsed: string[];
};

export type ShiftAutoPlanPositionPlan = {
  position: string;
  dailyHeadcount: number;
  /** วันในเดือน × คนต่อวัน */
  totalSlots: number;
  /** วันที่จัดจริง (หักวันหยุด) × คนต่อวัน */
  scheduledSlots: number;
  /** ปัดขึ้นจาก คนต่อวัน × 7 ÷ 6 */
  minimumEmployees: number;
  availableEmployees: number;
  understaffedSlots: number;
  slots: Array<{ shiftId: string; shiftName: string }>;
  employees: ShiftAutoPlanEmployee[];
};

export type ShiftAutoPlanDaySlot = {
  shiftId: string;
  shiftName: string;
  position: string;
  slotIndex: number;
  /** ไม่มีค่า = ช่องนี้ขาดคน */
  userId?: string;
  employeeCode?: string;
  displayName?: string;
  source?: ShiftAutoPlanRole;
  unfilledReason?: "NO_ELIGIBLE_EMPLOYEE";
  onApprovedLeave?: boolean;
};

export type ShiftAutoPlanDay = {
  date: string;
  weekday: number;
  isHoliday: boolean;
  holidayName?: string;
  holidayType?: string;
  /** true = วันหยุด ไม่สร้างรอบกะ */
  skipped: boolean;
  slots: ShiftAutoPlanDaySlot[];
  filledCount: number;
  understaffedCount: number;
};

export type ShiftAutoPlanWarningCode =
  | "BELOW_MINIMUM"
  | "NO_EMPLOYEES"
  | "REFILL_MULTI_SHIFT"
  | "SHIFT_INACTIVE"
  | "EXISTING_ROUNDS"
  | "LEAVE_CONFLICT"
  | "CROSS_POSITION_CONFLICT"
  | "USER_POSITION_MISMATCH"
  | "ROLE_FILTER_EXCLUDED"
  | "USER_ROLE_MISMATCH";

export type ShiftAutoPlanWarning = {
  code: ShiftAutoPlanWarningCode;
  message: string;
  date?: string;
  userId?: string;
  position?: string;
};

export type ShiftAutoPlanWriteResult = {
  createdRounds: number;
  updatedRounds: number;
  addedMembers: number;
  removedMembers: number;
  skippedRounds: Array<{
    date: string;
    shiftId: string;
    shiftName: string;
    reason: string;
  }>;
};

export type ShiftAutoPlanCoverage = {
  pass: boolean;
  requiredSlots: number;
  assignedSlots: number;
  shortageSlots: number;
};

export type ShiftAutoPlanWorkloadGroup = {
  position: string;
  shiftId: string;
  shiftName: string;
  minDays: number;
  maxDays: number;
  spread: number;
};

export type ShiftAutoPlanWorkload = {
  pass: boolean;
  maxSpread: number;
  groups: ShiftAutoPlanWorkloadGroup[];
};

export type ShiftAutoPlan = {
  /** มีเฉพาะตอนจัดเป็นรายเดือน */
  month?: string;
  dateFrom: string;
  dateTo: string;
  /** จำนวนวันของช่วงที่จัด */
  dayCount: number;
  /** @deprecated ค่าเดียวกับ dayCount */
  daysInMonth: number;
  workingDays: number;
  totalSlots: number;
  scheduledSlots: number;
  filledSlots: number;
  understaffedSlots: number;
  coverage: ShiftAutoPlanCoverage;
  workload: ShiftAutoPlanWorkload;
  /** รอบกะที่แผนนี้จะเขียน (วัน × กะ ที่ไม่ซ้ำ) */
  plannedRoundCount: number;
  /** รอบกะที่มีอยู่แล้วและทับกับแผนนี้ — >0 ต้องติ๊กทับ ไม่งั้นไม่มีอะไรถูกบันทึก */
  existingRoundCount: number;
  positions: ShiftAutoPlanPositionPlan[];
  days: ShiftAutoPlanDay[];
  warnings: ShiftAutoPlanWarning[];
  applied: boolean;
  writeResult?: ShiftAutoPlanWriteResult;
};

/* ---------- envelopes ---------- */

export type ShiftListApiResponse = ApiEnvelope<Shift[]>;
export type ShiftApiResponse = ApiEnvelope<Shift>;
export type ShiftScheduleApiResponse = ApiEnvelope<ShiftSchedule>;
export type ShiftCalendarApiResponse = ApiEnvelope<ShiftCalendar>;
export type ShiftAssignmentListApiResponse = ApiEnvelope<ShiftAssignmentList>;
export type ShiftRosterApiResponse = ApiEnvelope<ShiftRoster>;
export type BulkShiftScheduleApiResponse = ApiEnvelope<BulkShiftScheduleResult>;
export type WorkCalendarDayApiResponse = ApiEnvelope<WorkCalendarDay>;
export type WorkCalendarDayListApiResponse = ApiEnvelope<WorkCalendarDay[]>;
export type MyShiftScheduleApiResponse = ApiEnvelope<MyShiftSchedule>;
export type ShiftAutoPlanApiResponse = ApiEnvelope<ShiftAutoPlan>;
export type ShiftAutoPlanPositionOptionsApiResponse = ApiEnvelope<
  ShiftAutoPlanPositionOption[]
>;
export type ShiftAutoPlanRoleOptionsApiResponse =
  ApiEnvelope<ShiftAutoPlanRoleOptions>;
