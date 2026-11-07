/**
 * ใบแปรสภาพวัตถุดิบ — วัตถุดิบเข้าหลายตัว ผลผลิตออกหลายตัว
 *
 * ต่างจากรอบงานเดิม (`production-stage-run.ts`) ที่รับได้ 1 เข้า → 1 ออก
 * และของพลอยได้เป็นแค่ตัวเลขอ้างอิงที่ไม่เคยเข้าสต๊อก
 */

import { getStoredLanguage } from "@/lib/i18n/language";
import { translate, type Language } from "@/lib/i18n/translate";

const CONVERSION_STATUS_EN: Record<string, string> = {
  "แบบร่างเอกสาร": "Draft",
  "กำลังทำงาน": "In progress",
  "เสร็จแล้ว": "Completed",
  "ยกเลิก": "Cancelled",
  "เปิดอยู่": "Open",
  "ปิดแล้ว": "Closed",
  "ยังไม่เริ่ม": "Not started",
  "ทำครบทุกขั้นแล้ว": "All steps done",
};

/** แปลป้ายสถานะใบแปรสภาพ/ใบงาน/รอบขั้นตอน — แยกจากปุ่ม "ยกเลิก" (Cancel) · เรียกตอนเรนเดอร์ในคอมโพเนนต์ที่ใช้ useT() อยู่แล้ว */
export function tConvStatusLabel(label: string, lang?: Language): string {
  const current = lang ?? getStoredLanguage();
  if (current === "en" && CONVERSION_STATUS_EN[label]) {
    return CONVERSION_STATUS_EN[label];
  }
  return translate(current, label);
}

export const MATERIAL_CONVERSION_STATUS = [
  "DRAFT",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type MaterialConversionStatus =
  (typeof MATERIAL_CONVERSION_STATUS)[number];

export const MATERIAL_CONVERSION_STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  IN_PROGRESS: "กำลังทำงาน",
  COMPLETED: "เสร็จแล้ว",
  CANCELLED: "ยกเลิก",
};

export const MATERIAL_CONVERSION_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  IN_PROGRESS: "processing",
  COMPLETED: "success",
  CANCELLED: "error",
};

/** ต้องตรงกับ `output-type.constants.ts` ฝั่ง backend */
export const OUTPUT_TYPES = [
  "MAIN",
  "CO_PRODUCT",
  "BY_PRODUCT",
  "WASTE",
] as const;

export type OutputType = (typeof OUTPUT_TYPES)[number];

export const OUTPUT_TYPE_LABEL: Record<string, string> = {
  MAIN: "ผลผลิตหลัก",
  CO_PRODUCT: "ผลิตภัณฑ์ร่วม",
  BY_PRODUCT: "ผลพลอยได้",
  WASTE: "ของเสีย (ไม่เข้าสต๊อก)",
};

export const OUTPUT_TYPE_COLOR: Record<string, string> = {
  MAIN: "green",
  CO_PRODUCT: "cyan",
  BY_PRODUCT: "gold",
  WASTE: "default",
};

/** ภาชนะบรรจุ (M7.5) — ต้องตรงกับ `packaging.constants.ts` ฝั่ง backend */
export const PACKAGING_TYPES = ["BIG_BAG", "BAG", "OTHER"] as const;

export const PACKAGING_TYPE_LABEL: Record<string, string> = {
  BIG_BAG: "Big Bag",
  BAG: "ถุง (Bag)",
  OTHER: "อื่น ๆ",
};

/** ของเสียไม่เข้าสต๊อก — ใช้ตัดสินใจว่าต้องกรอกคลังหรือไม่ */
export function outputPostsToStock(outputType?: string): boolean {
  return outputType !== undefined && outputType !== "WASTE";
}

export const MASS_BALANCE_STATUS_LABEL: Record<string, string> = {
  OK: "สมดุลมวลปกติ",
  NO_DATA: "ยังไม่มีข้อมูลให้เทียบ",
  NOT_COMPARABLE: "เทียบหน่วยไม่ได้",
  EXCEEDS_INPUT: "ผลผลิตเกินวัตถุดิบ",
};

export const COST_ALLOCATION_BASIS_LABEL: Record<string, string> = {
  BASE_QTY: "ปันตามน้ำหนัก",
  ACTUAL_QTY: "ปันตามจำนวน (แปลงหน่วยไม่ได้)",
  NONE: "ไม่มีต้นทุนให้ปัน",
};

export type MaterialConversionUser = {
  id: string;
  username: string;
  displayName: string;
};

export type MaterialConversionInputLine = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  warehouseId: string;
  locationId: string;
  lotId?: string;
  unitId: string;
  unitCode?: string;
  plannedQty: string;
  actualQty: string;
  /** ว่างหมายถึงไม่มีกฎแปลงหน่วย ไม่ใช่ศูนย์ */
  baseQty?: string;
  unitCost?: string;
  remark?: string;
  sortOrder: number;
};

export type MaterialConversionOutputLine = {
  id: string;
  outputType: string;
  outputTypeLabel: string;
  postsToStock: boolean;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  warehouseId?: string;
  locationId?: string;
  plannedQty: string;
  actualQty?: string;
  baseQty?: string;
  unitCost?: string;
  /** มูลค่าที่ปันมา — ผลรวมทุกบรรทัดเท่าต้นทุนวัตถุดิบเป๊ะ */
  amount?: string;
  lotId?: string;
  lotNo?: string;
  disposalStatus?: string;
  floorScaleTicketId?: string;
  floorScaleTicketNo?: string;
  /** MANUAL | SCALE | SCALE_OVERRIDE */
  weightSource?: string;
  weightDiffReason?: string;
  packagingType?: string;
  packageCount?: number;
  grossQty?: string;
  tareQty?: string;
  remark?: string;
  sortOrder: number;
};

export type ConversionEquipmentOption = {
  id: string;
  equipmentCode: string;
  name: string;
};

export type ConversionOperatorOption = {
  id: string;
  displayName: string;
  employeeCode?: string;
  position?: string;
};

export type ConversionLookups = {
  equipment: ConversionEquipmentOption[];
  operators: ConversionOperatorOption[];
};

export type ConversionScaleTicket = {
  id: string;
  ticketNo: string;
  netWeightKg: string;
  scaleCode?: string;
  createdAt: string;
};

export type RunDowntime = {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  category: string;
  startAt: string;
  endAt?: string;
  reason: string;
  rootCauseCategory?: string;
  rootCause?: string;
  durationMinutes: number;
  isOpen: boolean;
};

export type RunDowntimeList = { items: RunDowntime[]; totalMinutes: number };

export type StartRunDowntimeBody = {
  equipmentId?: string;
  startAt?: string;
  reason: string;
  rootCauseCategory?: string;
};

export type EndRunDowntimeBody = {
  endAt?: string;
  rootCauseCategory?: string;
  rootCause?: string;
};

export const DOWNTIME_ROOT_CAUSE_LABEL: Record<string, string> = {
  MECHANICAL: "เครื่องกล",
  ELECTRICAL: "ไฟฟ้า",
  INSTRUMENT: "เครื่องมือวัด/ควบคุม",
  OPERATION: "การใช้งาน/ผู้ปฏิบัติ",
  MATERIAL: "วัตถุดิบ/วัสดุ",
  UTILITY: "สาธารณูปโภค",
  OTHER: "อื่น ๆ",
};

export type MaterialConversionRun = {
  id: string;
  /** เครื่องจักรที่ใช้ (M4.2) */
  equipment?: { id: string; equipmentCode: string; name: string };
  /** ผู้ปฏิบัติงานจริง (ไม่ใช่ผู้กดปุ่ม) */
  operators?: Array<{ id: string; displayName: string; employeeCode?: string }>;
  runNo: string;
  routeId: string;
  routeCode?: string;
  routeNameTh?: string;
  stepId: string;
  stepCode: string;
  stepNameTh?: string;
  stepOrder?: number;
  sequenceNo?: number;
  runDate: string;
  status: string;
  batchNo?: string;
  /** ใบงานที่สังกัด — ว่างคือเอกสารเดี่ยว */
  jobId?: string;
  jobNo?: string;
  jobCompletedStepCount?: number;
  jobPlannedStepCount?: number;
  productionOrderId?: string;
  totalInputBaseQty?: string;
  totalOutputBaseQty?: string;
  totalWasteBaseQty?: string;
  baseUnitId?: string;
  baseUnitCode?: string;
  massBalanceStatus?: string;
  massBalanceMessage?: string;
  /** `null` หมายถึงเทียบไม่ได้ ไม่ใช่ 0% */
  yieldPercent: number | null;
  yieldComparable: boolean;
  costAllocationBasis?: string;
  totalInputCost?: string;
  stepSkipWarning?: string;
  remark?: string;
  requestedBy?: MaterialConversionUser;
  startedBy?: MaterialConversionUser;
  startedAt?: string;
  completedBy?: MaterialConversionUser;
  completedAt?: string;
  cancelledBy?: MaterialConversionUser;
  cancelledAt?: string;
  cancelReason?: string;
  inputs: MaterialConversionInputLine[];
  outputs: MaterialConversionOutputLine[];
  /** true = แถวประวัติจากเมนูเดิม — อ่านอย่างเดียว เดินงานที่หน้านี้ไม่ได้ */
  isLegacy: boolean;
  /** TIRE_PREP | RCB — ว่างเมื่อเป็นเอกสารใหม่ */
  legacySource?: string;
  /** ทางเปิดดูรายละเอียดของแถวเก่า (หน้าเดิมยังทำงานปกติ) */
  legacyDetailPath?: string;
  /**
   * ของพลอยได้ที่บันทึกไว้ในเอกสารเก่า — **บันทึกอ้างอิงเท่านั้น ไม่เคยเข้าสต๊อก**
   * จึงไม่ถูกแปลงเป็นบรรทัดผลผลิต
   */
  legacyByproductQty?: string;
  /** แถวเก่าเป็น 1 เสมอ เพราะโครงเดิมรับผลผลิตได้ตัวเดียว */
  outputLineCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MaterialConversionListData = {
  items: MaterialConversionRun[];
  total: number;
  page: number;
  limit: number;
};

export type StepSkipWarning = {
  skipped: Array<{ stepCode: string; nameTh: string; stepOrder: number }>;
  message?: string;
};

export type QueryMaterialConversionsParams = {
  runNo?: string;
  routeId?: string;
  stepCode?: string;
  status?: string;
  batchNo?: string;
  productionOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  /** รวมประวัติจากเมนูเดิมมาแสดงด้วย — ไม่ส่ง = รวม (ค่าตั้งต้นของ backend) */
  includeLegacy?: boolean;
  /** เฉพาะเอกสารในใบงานนี้ — ส่งมาแล้ว backend จะไม่รวมประวัติเมนูเดิมให้เอง */
  jobId?: string;
  /** true = เฉพาะที่อยู่ในใบงาน · false = เฉพาะเอกสารเดี่ยว · ไม่ส่ง = ทั้งหมด */
  hasJob?: boolean;
};

export type CreateMaterialConversionInputBody = {
  itemId: string;
  warehouseId: string;
  locationId: string;
  lotId: string;
  unitId: string;
  plannedQty: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateMaterialConversionOutputBody = {
  outputType: string;
  itemId: string;
  unitId: string;
  warehouseId?: string;
  locationId?: string;
  plannedQty: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateMaterialConversionBody = {
  routeId: string;
  stepId: string;
  runDate: string;
  batchNo?: string;
  /** เครื่องจักรที่ใช้ (M4.2) */
  equipmentId?: string;
  /** ผู้ปฏิบัติงานจริง หลายคนได้ (M4.2) */
  operatorIds?: string[];
  productionOrderId?: string;
  /** ส่งมาแล้ว backend จะบังคับ Batch ของใบงานทับ `batchNo` เสมอ */
  jobId?: string;
  inputs: CreateMaterialConversionInputBody[];
  outputs: CreateMaterialConversionOutputBody[];
  remark?: string;
};

export type StartMaterialConversionBody = {
  inputs?: Array<{ lineId: string; actualQty: number }>;
  remark?: string;
};

export type CompleteMaterialConversionBody = {
  outputs?: Array<{
    lineId: string;
    /** ไม่ต้องส่งเมื่อส่ง grossQty — backend คำนวณ gross − tare ให้ */
    actualQty?: number;
    remark?: string;
    /** ตั๋วชั่ง Floor Scale — backend ใช้น้ำหนักสุทธิตามตั๋ว (M4.3) */
    floorScaleTicketId?: string;
    /** บังคับเมื่อ actualQty ที่กรอกต่างจากตั๋ว */
    weightDiffReason?: string;
    packagingType?: string;
    packageCount?: number;
    grossQty?: number;
    tareQty?: number;
  }>;
  remark?: string;
};

/** สรุปสารเคมีที่ใช้ (M7.4) */
export type ChemicalUsageItem = {
  itemId: string;
  itemCode: string;
  itemNameTh: string;
  unitCode: string;
  usedQty: number;
  expectedQty?: number;
  variancePct?: number;
  overTolerance?: boolean;
  lots: Array<{
    lotId: string;
    lotNo: string;
    qcStatus?: string;
    runNo: string;
    qty: number;
  }>;
};

export type ChemicalUsage = {
  scope: "RUN" | "BATCH";
  runId?: string;
  batchNo?: string;
  tolerancePct: number;
  items: ChemicalUsageItem[];
};

export type ChemicalUsageApiResponse = {
  success: boolean;
  message: string;
  data: ChemicalUsage;
};

export type CancelMaterialConversionBody = {
  cancelReason?: string;
};

// ─── master data: เส้นทางแปรสภาพ ────────────────────────────────────────────

export type MaterialConversionRouteStepLine = {
  id: string;
  lineRole: string;
  outputType?: string | null;
  itemId?: string | null;
  itemCode?: string;
  itemNameTh?: string;
  unitId?: string | null;
  unitCode?: string;
  /** สัดส่วนที่คาดว่าจะได้ต่อวัตถุดิบเข้า 1 หน่วย */
  expectedRatio?: string | null;
  isRequired: boolean;
  sortOrder: number;
};

export type MaterialConversionRouteStep = {
  id: string;
  routeId: string;
  stepCode: string;
  nameTh: string;
  sequenceNo: number;
  stepOrder: number;
  isActive: boolean;
  remark?: string;
  lines: MaterialConversionRouteStepLine[];
  /** มากกว่า 0 แปลว่าลบไม่ได้ */
  runCount: number;
};

export type MaterialConversionRoute = {
  id: string;
  routeCode: string;
  nameTh: string;
  description?: string;
  runNoPrefix: string;
  legacyModule?: string | null;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  steps: MaterialConversionRouteStep[];
};

export type RouteStepLineBody = {
  id?: string;
  lineRole: string;
  outputType?: string;
  itemId?: string;
  unitId?: string;
  expectedRatio?: number;
  isRequired?: boolean;
  sortOrder?: number;
};

export type CreateRouteBody = {
  routeCode: string;
  nameTh: string;
  description?: string;
  runNoPrefix?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateRouteBody = Partial<Omit<CreateRouteBody, "routeCode">>;

export type CreateRouteStepBody = {
  stepCode: string;
  nameTh: string;
  stepOrder?: number;
  remark?: string;
  lines?: RouteStepLineBody[];
};

export type UpdateRouteStepBody = {
  nameTh?: string;
  stepOrder?: number;
  isActive?: boolean;
  remark?: string;
  lines?: RouteStepLineBody[];
};

type ApiEnvelope<T> = { statusCode: number; message: string; data: T };

export type MaterialConversionApiResponse = ApiEnvelope<MaterialConversionRun>;
export type MaterialConversionListApiResponse =
  ApiEnvelope<MaterialConversionListData>;
export type StepSkipCheckApiResponse = ApiEnvelope<StepSkipWarning>;
export type MaterialConversionRouteApiResponse =
  ApiEnvelope<MaterialConversionRoute>;
export type MaterialConversionRouteListApiResponse = ApiEnvelope<
  MaterialConversionRoute[]
>;
export type MaterialConversionRouteStepApiResponse =
  ApiEnvelope<MaterialConversionRouteStep>;

// ─── ใบงานแปรสภาพตามเส้นทาง ─────────────────────────────────────────────────
//
// เอกสารพ่อที่คุมทั้งเส้นทางไว้ใบเดียว — เปิดครั้งเดียวแล้วทยอยกรอกทีละขั้น
// ตามวันที่ทำงานจริง โดยระบบบังคับเลข Batch ให้เท่ากันทั้งสาย
//
// **1 เอกสารขั้นตอน = 1 ขั้น ไม่เปลี่ยน** — ใบงานคือพ่อที่รวมเอกสารหลายใบ
// ไม่ใช่เอกสารที่ยืดออกไปหลายขั้น

export const MATERIAL_CONVERSION_JOB_STATUS_LABEL: Record<string, string> = {
  OPEN: "เปิดอยู่",
  CLOSED: "ปิดแล้ว",
  CANCELLED: "ยกเลิก",
};

export const MATERIAL_CONVERSION_JOB_STATUS_COLOR: Record<string, string> = {
  OPEN: "processing",
  CLOSED: "default",
  CANCELLED: "error",
};

export const MATERIAL_CONVERSION_JOB_PROGRESS_LABEL: Record<string, string> = {
  NOT_STARTED: "ยังไม่เริ่ม",
  IN_PROGRESS: "กำลังทำงาน",
  COMPLETED: "ทำครบทุกขั้นแล้ว",
};

/** สภาพของขั้นบนไทม์ไลน์ — `NOT_STARTED` คือยังไม่เคยเปิดเอกสารของขั้นนั้น */
export const JOB_STEP_STATE_LABEL: Record<string, string> = {
  NOT_STARTED: "ยังไม่เริ่ม",
  DRAFT: "แบบร่างเอกสาร",
  IN_PROGRESS: "กำลังทำงาน",
  COMPLETED: "เสร็จแล้ว",
};

export const JOB_STEP_STATE_COLOR: Record<string, string> = {
  NOT_STARTED: "default",
  DRAFT: "default",
  IN_PROGRESS: "processing",
  COMPLETED: "success",
};

export type MaterialConversionJobStepRun = {
  id: string;
  runNo: string;
  status: string;
  runDate: string;
};

export type MaterialConversionJobStep = {
  stepId: string;
  stepCode: string;
  nameTh: string;
  stepOrder: number;
  sequenceNo?: number;
  state: string;
  /** ว่างคือยังไม่เคยเปิดเอกสารของขั้นนี้ */
  runId?: string;
  runNo?: string;
  runDate?: string;
  yieldPercent?: number | null;
  massBalanceStatus?: string;
  openRunCount: number;
  runs: MaterialConversionJobStepRun[];
};

export type MaterialConversionJob = {
  id: string;
  jobNo: string;
  routeId: string;
  routeCode?: string;
  routeNameTh?: string;
  batchNo: string;
  productionOrderId?: string;
  plannedStartDate: string;
  /** สถานะที่คนตั้ง */
  status: string;
  /** ความคืบหน้าที่ระบบคิดจากเอกสารจริง */
  progressStatus: string;
  plannedStepCount: number;
  completedStepCount: number;
  /** ร่าง + กำลังทำงาน — มากกว่า 0 แปลว่าปิดใบงานไม่ได้ */
  openRunCount: number;
  /** ไม่ตรงกับ plannedStepCount แปลว่าเส้นทางถูกแก้หลังเปิดใบงาน */
  currentRouteStepCount?: number;
  remark?: string;
  requestedBy?: MaterialConversionUser;
  closedBy?: MaterialConversionUser;
  closedAt?: string;
  closeReason?: string;
  cancelledBy?: MaterialConversionUser;
  cancelledAt?: string;
  cancelReason?: string;
  steps: MaterialConversionJobStep[];
  unplannedStepCodes: string[];
  createdAt: string;
  updatedAt: string;
};

export type MaterialConversionJobListData = {
  items: MaterialConversionJob[];
  total: number;
  page: number;
  limit: number;
};

export type QueryMaterialConversionJobsParams = {
  jobNo?: string;
  routeId?: string;
  batchNo?: string;
  status?: string;
  progressStatus?: string;
  productionOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateMaterialConversionJobBody = {
  routeId: string;
  batchNo: string;
  plannedStartDate: string;
  productionOrderId?: string;
  remark?: string;
};

export type CloseMaterialConversionJobBody = { closeReason?: string };
export type CancelMaterialConversionJobBody = { cancelReason?: string };

export type MaterialConversionJobApiResponse =
  ApiEnvelope<MaterialConversionJob>;
export type MaterialConversionJobListApiResponse =
  ApiEnvelope<MaterialConversionJobListData>;
