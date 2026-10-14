export type ScheduleDisplayStatus = "PENDING" | "CONFIRMED" | "OVERDUE";

export type ScheduleDayType = "PRODUCTION" | "SHUTDOWN" | "EXTRA_OFF";

export type ScheduleRound = {
  id: string;
  planId: string;
  sequence: number;
  roundNo: string;
  startDate: string;
  endDate: string;
  shutdownStartDate: string;
  shutdownEndDate: string;
  runDays: number;
  shutdownDays: number;
  extraOffDates: string[];
  status: "PENDING" | "CONFIRMED";
  displayStatus: ScheduleDisplayStatus;
  confirmByDate: string;
  nearDeadline: boolean;
  confirmReason?: string | null;
  confirmedAt?: string | null;
  productionCycleId?: string | null;
  productionCycleNo?: string | null;
};

export type ScheduleRoundList = {
  leadDays: number;
  today: string;
  items: ScheduleRound[];
};

export type ScheduleImpact = {
  id: string;
  roundNo: string;
  beforeStartDate: string;
  beforeEndDate: string;
  beforeShutdownStartDate: string;
  beforeShutdownEndDate: string;
  afterStartDate: string;
  afterEndDate: string;
  afterShutdownStartDate: string;
  afterShutdownEndDate: string;
  droppedExtraOffDates: string[];
};

export type SchedulePreview = {
  round: ScheduleRound;
  droppedExtraOffDates: string[];
  impacts: ScheduleImpact[];
};

export type ScheduleCalendarDay = {
  date: string;
  roundId: string;
  roundNo: string;
  dayType: ScheduleDayType;
  displayStatus: ScheduleDisplayStatus;
  confirmed: boolean;
};

export type ScheduleCalendar = {
  month: string;
  totalRounds: number;
  leadDays: number;
  days: ScheduleCalendarDay[];
};

export type ScheduleSettings = {
  confirmLeadDays: number;
};

export type ConfirmedProductionRound = {
  id: string;
  roundNo: string;
  startDate: string;
  endDate: string;
  shutdownStartDate: string;
  shutdownEndDate: string;
  /** วันหยุดผลิตเพิ่มเติมที่อยู่ในช่วงผลิต — จัดกะช่วงปฏิบัติงานปกติจะข้าม */
  extraOffDates: string[];
};

export type CreateProductionPlanBody = {
  rounds: { startDate: string }[];
};

export type UpdateScheduleRoundBody = {
  startDate: string;
  extraOffDates?: string[];
};

type Envelope<T> = { message: string; data: T };

export type ScheduleRoundListResponse = Envelope<ScheduleRoundList>;
export type ScheduleRoundResponse = Envelope<ScheduleRound>;
export type SchedulePreviewResponse = Envelope<SchedulePreview>;
export type ScheduleCalendarResponse = Envelope<ScheduleCalendar>;
export type ScheduleSettingsResponse = Envelope<ScheduleSettings>;
export type ConfirmedProductionRoundListResponse = Envelope<ConfirmedProductionRound[]>;
