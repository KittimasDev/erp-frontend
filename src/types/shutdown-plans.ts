export type ShutdownPlanStatus = "ACTIVE" | "CANCELLED";

export type ShutdownWarningCode =
  | "SHORTAGE"
  | "LEAVE_CONFLICT"
  | "NORMAL_SHIFT_CONFLICT"
  | "INACTIVE_MEMBER"
  | "NOT_HIRED_YET"
  | "POSITION_NOT_IN_DEMANDS"
  | "DAY_ALREADY_MARKED";

export type ShutdownWarning = {
  code: ShutdownWarningCode;
  message: string;
  userId?: string;
};

export type ShutdownDemand = {
  id: string;
  position: string;
  shiftId: string;
  shiftName: string;
  headcount: number;
  /** กำหนดไว้แล้ว (ตำแหน่งตรง + กะตรง + ยังใช้งาน) */
  assigned: number;
  shortage: number;
};

export type ShutdownMember = {
  userId: string;
  displayName: string;
  employeeCode?: string;
  position?: string;
  shiftId: string;
  shiftName: string;
  hasWarning: boolean;
};

export type ShutdownPlan = {
  id: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  dayCount: number;
  status: ShutdownPlanStatus;
  note?: string | null;
  cancelReason?: string | null;
  demands: ShutdownDemand[];
  members: ShutdownMember[];
  requiredHeadcount: number;
  assignedHeadcount: number;
  shortageHeadcount: number;
  warnings: ShutdownWarning[];
  createdAt: string;
};

export type ShutdownDemandInput = {
  position: string;
  shiftId: string;
  headcount: number;
};

export type ShutdownMemberInput = {
  userId: string;
  shiftId: string;
};

export type CreateShutdownPlanRequest = {
  name: string;
  dateFrom: string;
  dateTo: string;
  note?: string;
  demands?: ShutdownDemandInput[];
  members?: ShutdownMemberInput[];
};

export type UpdateShutdownPlanRequest = Partial<
  Pick<CreateShutdownPlanRequest, "name" | "dateFrom" | "dateTo" | "note" | "demands">
>;

export type ShutdownSuggestion = {
  userId: string;
  displayName: string;
  employeeCode?: string;
  position: string;
  shiftId: string;
  shiftName: string;
};

export type ShutdownSuggestResult = {
  suggestions: ShutdownSuggestion[];
  remainingShortages: ShutdownWarning[];
};

export type ShutdownPlanApiResponse = {
  statusCode?: number;
  message: string;
  data: ShutdownPlan;
};

export type ShutdownPlanListApiResponse = {
  statusCode?: number;
  message: string;
  data: ShutdownPlan[];
};

export type ShutdownSuggestApiResponse = {
  statusCode?: number;
  message: string;
  data: ShutdownSuggestResult;
};
