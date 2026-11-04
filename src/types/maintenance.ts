type Envelope<T> = { statusCode?: number; message: string; data: T };

export const EQUIPMENT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "ใช้งาน",
  UNDER_MAINTENANCE: "ซ่อมบำรุง",
  RETIRED: "เลิกใช้",
};

export const ROOT_CAUSE_OPTIONS = [
  { value: "MECHANICAL", label: "เครื่องกล" },
  { value: "ELECTRICAL", label: "ไฟฟ้า" },
  { value: "INSTRUMENT", label: "เครื่องมือวัด/ควบคุม" },
  { value: "OPERATION", label: "การใช้งาน/ผู้ปฏิบัติ" },
  { value: "MATERIAL", label: "วัตถุดิบ/วัสดุ" },
  { value: "UTILITY", label: "สาธารณูปโภค" },
  { value: "OTHER", label: "อื่น ๆ" },
] as const;

export const PRIORITY_OPTIONS = [
  { value: "LOW", label: "ต่ำ" },
  { value: "NORMAL", label: "ปกติ" },
  { value: "HIGH", label: "สูง" },
  { value: "CRITICAL", label: "วิกฤต" },
] as const;

export const WORK_ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  OPEN: "เปิด",
  IN_PROGRESS: "กำลังทำ",
  COMPLETED: "เสร็จ",
  CANCELLED: "ยกเลิก",
};

export type PlannedPart = { itemId?: string; partName: string; quantity: number };

// ── Equipment ──
export type Equipment = {
  id: string;
  equipmentCode: string;
  name: string;
  locationId?: string;
  locationCode?: string;
  status: string;
  /** ชื่อประเภทเครื่องจักร (ระบบเขียนให้ตามประเภทใน Master — อ่านอย่างเดียว) */
  category?: string;
  /** ประเภทเครื่องจักรจาก Master (/masters/equipment-types) */
  equipmentTypeId?: string | null;
  equipmentTypeName?: string | null;
  /** กำลังผลิตต่อชั่วโมง — ใช้คาดการณ์/วิเคราะห์เท่านั้น */
  capacity?: number | null;
  capacityUnitId?: string | null;
  capacityUnitLabel?: string | null;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  installedDate?: string;
  warrantyExpiryDate?: string;
  warrantyNote?: string;
  underWarranty?: boolean;
  runningHours?: number;
  remark?: string;
};

export type EquipmentBody = {
  equipmentCode?: string;
  name?: string;
  locationId?: string;
  status?: string;
  /** null = ล้างประเภท */
  equipmentTypeId?: string | null;
  /** ต้องส่งคู่กัน (หรือ null ทั้งคู่) */
  capacity?: number | null;
  capacityUnitId?: string | null;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  /** ไม่ระบุ/ล้างวันที่ = null (ห้ามส่ง "") */
  installedDate?: string | null;
  warrantyExpiryDate?: string | null;
  warrantyNote?: string;
  runningHours?: number;
  remark?: string;
};

export type EquipmentQuery = { q?: string; equipmentTypeId?: string; status?: string };

// ── PM ──
export type PmScheduleType = "CALENDAR" | "CYCLE";
export type PmDueState = "NOT_DUE" | "UPCOMING" | "DUE" | "OVERDUE";

export type PmSchedule = {
  id: string;
  equipmentId: string;
  equipmentCode?: string;
  equipmentName?: string;
  title?: string;
  scheduleType: PmScheduleType;
  frequencyDays?: number;
  frequencyCycles?: number;
  nextDueDate?: string;
  leadDays: number;
  autoGenerate: boolean;
  taskDescription?: string;
  plannedParts?: PlannedPart[];
  plannedManpower?: number;
  lastGeneratedAt?: string;
  lastDoneAt?: string;
  isActive: boolean;
  remark?: string;
  dueState: PmDueState;
  dueLabel: string;
  daysUntilDue?: number;
  cyclesRemaining?: number;
  openWorkOrderNo?: string;
};

export type PmScheduleBody = {
  equipmentId?: string;
  scheduleType?: PmScheduleType;
  title?: string;
  frequencyDays?: number;
  frequencyCycles?: number;
  nextDueDate?: string;
  leadDays?: number;
  autoGenerate?: boolean;
  taskDescription?: string;
  plannedParts?: PlannedPart[];
  plannedManpower?: number;
  isActive?: boolean;
  remark?: string;
};

// ── Work order ──
export type WorkOrderTechnician = {
  userId: string;
  displayName?: string;
  employeeCode?: string;
  role: "LEAD" | "ASSIST";
};

export type WorkOrderPartUsage = {
  id: string;
  itemId?: string;
  partName: string;
  quantity: string;
  remark?: string;
  unitCost: number;
  returnedQuantity: number;
  netCost: number;
  stockPosted: boolean;
};

export type WorkOrder = {
  id: string;
  workOrderNo: string;
  equipmentId: string;
  equipmentCode?: string;
  equipmentName?: string;
  type: "PM" | "CM";
  status: string;
  priority: string;
  description: string;
  pmScheduleId?: string;
  assignedToId?: string;
  technicians: WorkOrderTechnician[];
  reportedAt?: string;
  plannedDate?: string;
  shutdownPlanId?: string;
  startedAt?: string;
  completedAt?: string;
  completionNotes?: string;
  rootCauseCategory?: string;
  rootCause?: string;
  correctiveAction?: string;
  plannedParts?: PlannedPart[];
  plannedManpower?: number;
  pmCycleCount?: number;
  partUsages: WorkOrderPartUsage[];
  partsCost: number;
  downtime?: { id: string; category: string; startAt: string; repairStartedAt?: string; endAt?: string };
  createdAt: string;
};

export type WorkOrderQuery = {
  status?: string;
  type?: string;
  priority?: string;
  equipmentId?: string;
  technicianId?: string;
  workOrderNo?: string;
};

export type CreateWorkOrderBody = {
  equipmentId: string;
  type: "PM" | "CM";
  description: string;
  priority?: string;
  plannedDate?: string;
  plannedParts?: PlannedPart[];
  plannedManpower?: number;
  assignedToId?: string;
  assistantIds?: string[];
};

export type BreakdownBody = {
  equipmentId: string;
  description: string;
  priority?: string;
  reportedAt?: string;
  stopsEquipment?: boolean;
};

export type CompleteWorkOrderBody = {
  completionNotes?: string;
  rootCauseCategory?: string;
  rootCause?: string;
  correctiveAction?: string;
  partUsages?: Array<{ itemId?: string; partName: string; quantity: number; remark?: string }>;
};

// ── Downtime / history ──
export type EquipmentDowntime = {
  id: string;
  equipmentId: string;
  category: "PLANNED" | "UNPLANNED";
  startAt: string;
  repairStartedAt?: string;
  endAt?: string;
  reason: string;
  rootCauseCategory?: string;
  rootCause?: string;
  workOrderId?: string;
  durationMinutes: number;
  waitingMinutes: number;
  repairMinutes: number;
  isOpen: boolean;
};

export type MaintenanceHistory = {
  equipmentCode: string;
  workOrders: WorkOrder[];
  downtimes: EquipmentDowntime[];
  pmHistory: Array<{ workOrderNo: string; completedAt: string; pmCycleCount?: number; title?: string }>;
  totalDowntimeHours: string;
  totalPartsCost: number;
};

export type DowntimeSummaryRow = { key: string; label: string; count: number; hours: number };
export type DowntimeSummary = {
  from: string;
  to: string;
  totalHours: number;
  plannedHours: number;
  unplannedHours: number;
  mttrHours: number;
  avgWaitingHours: number;
  byEquipment: DowntimeSummaryRow[];
  byRootCause: DowntimeSummaryRow[];
};

// ── Shutdown ──
export type ShutdownMaintenancePlan = {
  id: string;
  name: string;
  dateFrom: string;
  dateTo: string;
  note?: string;
  workOrderCount: number;
  completedCount: number;
};

export type ShutdownMaintenanceDetail = ShutdownMaintenancePlan & {
  workOrders: WorkOrder[];
  candidates: PmSchedule[];
  plannedManpowerTotal: number;
  plannedPartsTotal: PlannedPart[];
};

export type ShutdownItemBody = {
  scheduleId?: string;
  equipmentId?: string;
  description?: string;
  plannedDate: string;
  priority?: string;
  plannedParts?: PlannedPart[];
  plannedManpower?: number;
  assignedToId?: string;
  assistantIds?: string[];
};

export type EquipmentListApiResponse = Envelope<Equipment[]>;
export type EquipmentApiResponse = Envelope<Equipment>;
export type PmScheduleListApiResponse = Envelope<PmSchedule[]>;
export type PmScheduleApiResponse = Envelope<PmSchedule>;
export type WorkOrderListApiResponse = Envelope<WorkOrder[]>;
export type WorkOrderApiResponse = Envelope<WorkOrder>;
export type DowntimeApiResponse = Envelope<EquipmentDowntime>;
export type MaintenanceHistoryApiResponse = Envelope<MaintenanceHistory>;
export type DowntimeSummaryApiResponse = Envelope<DowntimeSummary>;
export type ShutdownPlanListApiResponse = Envelope<ShutdownMaintenancePlan[]>;
export type ShutdownDetailApiResponse = Envelope<ShutdownMaintenanceDetail>;
export type PmCheckApiResponse = Envelope<{ generated: number; alerted: number }>;
