// ─── รอบผลิต 45+3 วัน (M5.1) + รายงานสรุปรอบ (M5.9) ─────────────────────────────

import { getStoredLanguage } from "@/lib/i18n/language";
import type { ProductionRecordingConfig } from "./production-formula";
import type {
  RecordingFieldValue,
  RecordingFieldValues,
} from "@/utils/recordingCalc";

export type ProductionCyclePhase =
  | "NOT_STARTED"
  | "RUNNING"
  | "SHUTDOWN"
  | "OVERDUE"
  | "CLOSED"
  | "CANCELLED";

export const CYCLE_PHASE_LABEL: Record<string, string> = {
  NOT_STARTED: "ยังไม่ถึงวันเริ่ม",
  RUNNING: "กำลังผลิต",
  SHUTDOWN: "ช่วง Shutdown",
  OVERDUE: "เลยกำหนด — รอปิดรอบ",
  CLOSED: "ปิดรอบแล้ว",
  CANCELLED: "ยกเลิก",
};

const CYCLE_PHASE_LABEL_EN: Record<string, string> = {
  NOT_STARTED: "Not started",
  RUNNING: "In production",
  SHUTDOWN: "Shutdown period",
  OVERDUE: "Overdue - awaiting close",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

/** ป้ายสถานะรอบตามภาษาปัจจุบัน (ใช้ตอนเรนเดอร์ในคอมโพเนนต์ที่เรียก useT/useLanguage) */
export function cyclePhaseLabel(phase: string): string {
  if (getStoredLanguage() === "en") return CYCLE_PHASE_LABEL_EN[phase] ?? phase;
  return CYCLE_PHASE_LABEL[phase] ?? phase;
}

/** locale ของตัวเลขตามภาษาปัจจุบัน */
export function cycleNumLocale(): string {
  return getStoredLanguage() === "en" ? "en-GB" : "th-TH";
}

export const CYCLE_PHASE_COLOR: Record<string, string> = {
  NOT_STARTED: "default",
  RUNNING: "green",
  SHUTDOWN: "orange",
  OVERDUE: "red",
  CLOSED: "blue",
  CANCELLED: "default",
};

export type ProductionCycle = {
  id: string;
  cycleNo: string;
  startDate: string;
  runDays: number;
  shutdownDays: number;
  endDate: string;
  shutdownStartDate: string;
  shutdownEndDate: string;
  status: "OPEN" | "CLOSED" | "CANCELLED" | string;
  phase: ProductionCyclePhase | string;
  runDayNumber: number;
  remainingRunDays: number;
  runProgressPercent: number;
  orderCount: number;
  remark?: string;
  closedAt?: string;
  closeRemark?: string;
  cancelReason?: string;
  createdAt: string;
};

export type CreateProductionCycleBody = {
  startDate: string;
  runDays?: number;
  shutdownDays?: number;
  remark?: string;
};

export type UpdateProductionCycleBody = Partial<CreateProductionCycleBody>;

export type CycleSummaryOrder = {
  id: string;
  orderNo: string;
  batchNo?: string;
  status: string;
  inputQty: number;
  outputQty: number;
  yieldPercent?: number;
  comparable: boolean;
};

export type CycleSummaryOutput = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  quantity: number;
  yieldPercent?: number;
};

export type CycleSummaryDowntimeBucket = {
  key: string;
  label: string;
  hours: number;
  count: number;
};

export type CycleSummaryDaily = {
  date: string;
  inputKg: number;
  outputKg: number;
  lossKg: number;
  operatingHours: number;
  feedRateKgH?: number;
};

export type CycleSummaryShift = {
  shiftName: string;
  recordCount: number;
  inputKg: number;
  operatingHours: number;
};

export type ProductionCycleSummary = {
  cycle: ProductionCycle;
  orders: CycleSummaryOrder[];
  totalInputQty: number;
  totalOutputQty: number;
  unitCode?: string;
  quantitiesComparable: boolean;
  excludedOrderCount: number;
  massBalanceStatus: string;
  massBalanceWarning?: string;
  processLossQty: number;
  processLossPercent?: number;
  yieldPercent?: number;
  outputs: CycleSummaryOutput[];
  recordedInputKg: number;
  operatingHours: number;
  avgFeedRateKgH?: number;
  shiftRecordCount: number;
  efficiencyPercent?: number;
  totalDowntimeHours: number;
  plannedDowntimeHours: number;
  unplannedDowntimeHours: number;
  breakdownHours: number;
  plannedShutdownHours: number;
  downtimeByCategory: CycleSummaryDowntimeBucket[];
  daily: CycleSummaryDaily[];
  byShift: CycleSummaryShift[];
};

// ─── บันทึกการผลิตรายกะ (M5.2/M5.4) ──────────────────────────────────────────

export type ShiftRecordStockLine = {
  id: string;
  recordingFieldId?: string;
  itemId: string;
  warehouseId: string;
  locationId: string;
  lotId: string;
  unitId: string;
  quantity: string;
  stockMovementId?: string;
};

/** ชั่วโมงเดินเครื่องจริงรายเครื่องของกะหนึ่ง (Capacity/หน่วยคัดลอกจาก snapshot ของ MO) */
export type ShiftMachineRun = {
  equipmentId: string;
  equipmentCode: string;
  hours: number;
  capacity?: number | null;
  capacityUnitLabel?: string | null;
  source: "MANUAL" | "AUTO";
};

/**
 * OK = คำนวณได้ · อื่น ๆ = ไม่เปรียบเทียบเพราะเหตุนั้น
 * (ไม่มี Capacity / ไม่ได้ติ๊กฟิลด์เทียบ / ไม่กรอกชั่วโมง / ยังไม่มีผลจริง / หน่วยไม่ตรง)
 */
export type MachineForecastStatus =
  | "OK"
  | "NO_CAPACITY"
  | "NO_COMPARE_FIELD"
  | "NO_HOURS"
  | "NO_ACTUAL"
  | "UNIT_MISMATCH";

/** ผลคาดการณ์ (Capacity × ชั่วโมงเดินเครื่องจริง) เทียบผลจริงรายเครื่อง — ไม่มีค่ารวมข้ามเครื่อง */
export type MachineForecast = {
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  capacity?: number | null;
  capacityUnitLabel?: string | null;
  hours?: number | null;
  compareFieldId?: string | null;
  compareFieldCode?: string | null;
  forecast?: number | null;
  actual?: number | null;
  diff?: number | null;
  pctOfCapacity?: number | null;
  status: MachineForecastStatus;
};

export const MACHINE_FORECAST_STATUS_LABEL: Record<MachineForecastStatus, string> = {
  OK: "คำนวณได้",
  NO_CAPACITY: "เครื่องยังไม่ตั้ง Capacity",
  NO_COMPARE_FIELD: "สูตรยังไม่ติ๊กฟิลด์เทียบกำลังผลิต",
  NO_HOURS: "ยังไม่กรอกชั่วโมงเดินเครื่อง",
  NO_ACTUAL: "ยังไม่มีผลจริง",
  UNIT_MISMATCH: "หน่วยไม่ตรงกับหน่วยกำลังผลิต",
};

export type ShiftRecord = {
  id: string;
  productionOrderId: string;
  orderNo?: string;
  cycleId?: string;
  recordDate: string;
  shiftId: string;
  shiftName: string;
  /** DRAFT | CONFIRMED */
  status: string;
  confirmedAt?: string;
  confirmedById?: string;
  inputTireKg: number;
  operatingHours: number;
  feedRateKgH?: number;
  feedRateCalculated: boolean;
  /** ค่าฟิลด์ไดนามิกตาม recordingConfigSnapshot ของแถว (key = field.id) */
  values?: RecordingFieldValues;
  /** สำเนาฟอร์ม ณ เวลาสร้างแถว — ใช้ตอนแก้/แสดงแถวนี้ */
  recordingConfigSnapshot?: ProductionRecordingConfig | null;
  /** ผลคำนวณต่อ field.id จาก snapshot ของแถว */
  computedResults?: Record<string, number | null>;
  /** ชั่วโมงเดินเครื่องจริงรายเครื่อง — แถวเดิม/ใบที่ไม่ผูกเครื่องไม่มี */
  machineRuns?: ShiftMachineRun[];
  /** ผลคาดการณ์เทียบผลจริงรายเครื่อง (คำนวณจาก snapshot ของใบ) */
  machineForecasts?: MachineForecast[];
  stockLines?: ShiftRecordStockLine[];
  operators: Array<{ id: string; displayName: string }>;
  remark?: string;
  recordedByName?: string;
  createdAt: string;
};

export type ConfirmShiftRecordStockLineBody = {
  fieldId?: string;
  itemId: string;
  warehouseId: string;
  locationId: string;
  lotId: string;
  quantity: number;
  unitId: string;
};

export type ConfirmShiftRecordBody = {
  stockLines: ConfirmShiftRecordStockLineBody[];
};

export type CreateShiftRecordBody = {
  productionOrderId: string;
  recordDate: string;
  shiftId: string;
  inputTireKg?: number;
  operatingHours?: number;
  feedRateKgH?: number;
  values?: RecordingFieldValues;
  /** ไม่บังคับ — ส่งเฉพาะเครื่องที่กรอกชั่วโมง */
  machineRuns?: Array<{ equipmentId: string; hours: number }>;
  operatorIds?: string[];
  remark?: string;
};

export type UpdateShiftRecordBody = {
  inputTireKg?: number;
  operatingHours?: number;
  feedRateKgH?: number;
  values?: RecordingFieldValues;
  /** ส่งมา = แทนที่ทั้งชุด (ส่ง [] = ล้างชั่วโมงทั้งหมด) · ไม่ส่ง = ไม่แตะ */
  machineRuns?: Array<{ equipmentId: string; hours: number }>;
  operatorIds?: string[];
  remark?: string;
};

export type { RecordingFieldValue };

export type ProductionOrderLookups = {
  operators: Array<{ id: string; displayName: string; employeeCode?: string; position?: string }>;
  shifts: Array<{ id: string; name: string; startTime: string; endTime: string }>;
};

// ─── Machine Integration (M5.10) ────────────────────────────────────────────

export const MACHINE_PROTOCOLS = ["HTTP_PUSH", "OPC_UA", "MODBUS", "MQTT"] as const;

export const MACHINE_PROTOCOL_LABEL: Record<string, string> = {
  HTTP_PUSH: "HTTP Push (เครื่อง/Gateway ยิงเข้า API)",
  OPC_UA: "OPC-UA",
  MODBUS: "Modbus",
  MQTT: "MQTT",
};

export const MACHINE_TAG_PURPOSES = [
  "FEED_RATE",
  "OPERATING_STATE",
  "TEMPERATURE",
  "PRESSURE",
  "FLOW",
  "LEVEL",
  "OTHER",
] as const;

export const MACHINE_TAG_PURPOSE_LABEL: Record<string, string> = {
  FEED_RATE: "อัตราป้อน (Feed Rate)",
  OPERATING_STATE: "สถานะเดินเครื่อง",
  TEMPERATURE: "อุณหภูมิ",
  PRESSURE: "ความดัน",
  FLOW: "อัตราไหล",
  LEVEL: "ระดับ",
  OTHER: "อื่น ๆ",
};

export type MachineTag = {
  id: string;
  deviceId: string;
  tagCode: string;
  displayName: string;
  unit?: string;
  purpose: string;
  sourceAddress?: string;
  isActive: boolean;
  latestValue?: number;
  latestAt?: string;
};

export type MachineDevice = {
  id: string;
  deviceCode: string;
  name: string;
  protocol: string;
  /** false = โปรโตคอลนี้ยังเป็นโครงเท่านั้น (ไม่มี driver) */
  driverAvailable: boolean;
  connectionConfig: Record<string, unknown>;
  equipmentId?: string;
  equipmentCode?: string;
  apiKeyPrefix: string;
  isActive: boolean;
  lastSeenAt?: string;
  remark?: string;
  tags: MachineTag[];
};

export type MachineDeviceWithKey = MachineDevice & { apiKey: string };

export type CreateMachineDeviceBody = {
  deviceCode: string;
  name: string;
  protocol?: string;
  connectionConfig?: Record<string, unknown>;
  equipmentId?: string;
  remark?: string;
};

export type UpdateMachineDeviceBody = Partial<Omit<CreateMachineDeviceBody, "deviceCode">> & {
  isActive?: boolean;
};

export type CreateMachineTagBody = {
  tagCode: string;
  displayName: string;
  unit?: string;
  purpose?: string;
  sourceAddress?: string;
};

export type UpdateMachineTagBody = Partial<Omit<CreateMachineTagBody, "tagCode">> & {
  isActive?: boolean;
};

export type MachineReading = {
  id: string;
  value: number;
  recordedAt: string;
  receivedAt: string;
  quality: string;
};
