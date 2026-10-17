export type ControlLight = "GREEN" | "YELLOW" | "RED" | "IDLE";

export type ControlRoomCycle = {
  id: string;
  cycleNo: string;
  /** NOT_STARTED / RUNNING / SHUTDOWN / OVERDUE */
  phase: string;
  runDay: number;
  runDays: number;
  progressPercent: number;
  daysToShutdown?: number;
  startDate: string;
  endDate: string;
  shutdownStartDate: string;
  shutdownEndDate: string;
};

export type ControlRoomOrder = {
  id: string;
  orderNo: string;
  batchNo?: string;
  status: string;
  startedAt?: string;
  elapsedHours: number;
  netRunHours: number;
  downtimeHours: number;
  cycleTargetHours?: number;
  cycleProgressPercent?: number | null;
  light: ControlLight;
  reasons: string[];
};

export type ControlRoomFeedRate = {
  value?: number | null;
  unit: string;
  /** LIVE = ค่าสดจากอุปกรณ์ · SHIFT = จากบันทึกกะล่าสุด */
  source?: "LIVE" | "SHIFT";
  recordedAt?: string;
  cycleAvg?: number | null;
  light: ControlLight;
};

export type ControlRoomOutputRow = {
  itemName: string;
  itemCode?: string;
  unit?: string;
  quantity: number;
};

export type ControlRoomDowntimeAlert = {
  source: "PRODUCTION" | "EQUIPMENT";
  ref: string;
  reason?: string;
  category?: string;
  startedAt: string;
  minutesOpen: number;
};

export type ControlRoomEquipment = {
  id: string;
  code: string;
  name: string;
  category?: string;
  status: string;
  light: ControlLight;
  reasons: string[];
};

export type ControlRoomOverview = {
  asOf: string;
  overallLight: ControlLight;
  cycle?: ControlRoomCycle | null;
  production: {
    runningOrders: ControlRoomOrder[];
    feedRate: ControlRoomFeedRate;
    inputTodayKg: number;
    operatingHoursToday: number;
  };
  outputs: { today: ControlRoomOutputRow[]; cycleTotal: ControlRoomOutputRow[] };
  downtimeAlerts: ControlRoomDowntimeAlert[];
  equipment: ControlRoomEquipment[];
  counts: { red: number; yellow: number; green: number };
};

export type ControlRoomOverviewApiResponse = {
  message: string;
  data: ControlRoomOverview;
};
