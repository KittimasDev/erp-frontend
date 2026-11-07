import type { ProductionRecordingConfig } from "./production-formula";
import { getStoredLanguage, type Language } from "@/lib/i18n/language";
import { translate } from "@/lib/i18n/translate";

/** แปลป้ายสถานะใบสั่งผลิต/หมวดต่าง ๆ ตามภาษา — "ยกเลิก" ในบริบทสถานะ = Cancelled, "เสร็จสิ้น" = Completed */
export function tPoLabel(label: string, lang?: Language): string {
  const current = lang ?? getStoredLanguage();
  if (current === "en") {
    if (label === "ยกเลิก") return "Cancelled";
    if (label === "เสร็จสิ้น") return "Completed";
    if (label === "ยังไม่เริ่มผลิต") return "Not started";
    if (label === "กำลังผลิต") return "In production";
  }
  return translate(current, label);
}

export const ProductionOrderStatus = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ProductionOrderStatusValue =
  (typeof ProductionOrderStatus)[keyof typeof ProductionOrderStatus];

export const PRODUCTION_ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ยังไม่เริ่มผลิต",
  IN_PROGRESS: "กำลังผลิต",
  PAUSED: "หยุดชั่วคราว",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

/** ใบที่ยังเดินอยู่ — กำลังผลิตหรือหยุดชั่วคราว */
export const PRODUCTION_ORDER_RUNNING_STATUSES: readonly string[] = [
  ProductionOrderStatus.IN_PROGRESS,
  ProductionOrderStatus.PAUSED,
];

/**
 * หมวดสาเหตุการหยุดเดินเครื่อง — ต้องตรงกับ
 * `backend/.../constants/production-order-downtime.constants.ts`
 */
export const PRODUCTION_DOWNTIME_CATEGORY_LABEL: Record<string, string> = {
  EQUIPMENT_FAILURE: "เครื่องจักรขัดข้อง",
  MAINTENANCE: "ซ่อมบำรุง",
  MATERIAL_SHORTAGE: "วัตถุดิบไม่พอ",
  UTILITY_OUTAGE: "ไฟฟ้า/น้ำ/ลมขัดข้อง",
  QC_HOLD: "รอผลตรวจคุณภาพ",
  SHIFT_CHANGE: "เปลี่ยนกะ",
  OTHER: "อื่น ๆ",
};

/** แถวเก่าที่บันทึกไว้ก่อนมีหมวด — backfill ไม่ได้ ต้องโชว์ตามจริง */
export const PRODUCTION_DOWNTIME_UNCATEGORIZED_LABEL = "ไม่ระบุประเภท";

export const ProductionOrderPlanLineType = {
  OUTPUT: "OUTPUT",
  WASTE: "WASTE",
} as const;

export const PRODUCTION_ORDER_WASTE_DISPOSAL_STATUS_LABEL: Record<string, string> =
  {
    PENDING_DISPOSAL: "รอทำลาย",
    DISPOSED: "ทำลายแล้ว",
  };

export type ProductionOrderUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type ProductionOrderInputItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  warehouseId?: string;
  warehouseCode?: string;
  locationId?: string;
  locationCode?: string;
  lotId?: string;
  lotNo?: string;
  unitId: string;
  unitCode?: string;
  plannedQty: string;
  actualQty: string;
  remark?: string;
  sortOrder: number;
};

export type ProductionOrderPlanLine = {
  id: string;
  lineType: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  plannedQty: string;
  actualQty?: string;
  disposalStatus?: string;
  remark?: string;
  sortOrder: number;
};

export type ProductionOrderDowntime = {
  id: string;
  startAt: string;
  endAt?: string;
  reason: string;
  /** NULL ในแถวที่บันทึกก่อนมีหมวด — โชว์เป็น "ไม่ระบุประเภท" */
  category?: string;
  /** PLANNED = หยุดตามแผน · UNPLANNED = ไม่ตามแผน (M5.8) */
  stopType: "PLANNED" | "UNPLANNED" | string;
  /** Root Cause แยกจากเหตุผลที่หน้างานบันทึก */
  rootCause?: string;
  recordedById?: string;
  recordedByName?: string;
};

export type ProductionOrderLog = {
  id: string;
  loggedAt: string;
  note: string;
  recordedById?: string;
  recordedByName?: string;
};

export type ProductionOrder = {
  id: string;
  orderNo: string;
  /** รอบผลิต 45+3 วันที่ใบนี้สังกัด (M5.1) */
  cycleId?: string;
  cycleNo?: string;
  /** ผู้ปฏิบัติงานหลักและกะที่เริ่มผลิต (M5.2) */
  leadOperatorId?: string;
  leadOperatorName?: string;
  shiftId?: string;
  shiftName?: string;
  productionRequestId?: string;
  productionRequestNo?: string;
  /** สูตรที่ใช้วางแผนใบนี้ — ว่างคือกรอกมือ */
  productionFormulaId?: string;
  productionFormulaCode?: string;
  productionFormulaNameTh?: string;
  /** เลขรุ่นของสูตรตอนที่ใช้ — ตอบได้ว่าคิดมาจากสูตรรุ่นไหน */
  productionFormulaVersionNo?: number;
  /** snapshot ตอนสร้างใบ (ประวัติ/fallback แถวกะเก่า) */
  recordingConfigSnapshot?: ProductionRecordingConfig | null;
  /** ฟอร์มจากสูตรปัจจุบัน — ข้อมูลอ้างอิงเท่านั้น (บันทึกกะใหม่ใช้ recordingConfigSnapshot ของใบ) */
  liveRecordingConfig?: ProductionRecordingConfig | null;
  /** เครื่องจักรที่ใช้ใน MO ณ เวลาสร้างใบ (Capacity/หน่วยเป็นค่าตอนนั้น) — ไม่มี = ใบที่ไม่ผูกเครื่อง */
  machineSnapshot?: ProductionOrderMachineSnapshot | null;
  formulaTargetQty?: string;
  formulaDriverItemId?: string;
  salesOrderNo?: string;
  batchNo?: string;
  cycleTargetHours: string;
  plannedLaborHours?: string;
  productionDate: string;
  /** วันสิ้นสุดช่วงผลิต — ว่างหรือเท่าวันเริ่ม = วันเดียว */
  productionDateEnd?: string;
  status: string;
  /** AT_START = ตัดตอนเริ่มผลิต · ON_SHIFT_CONFIRM = ตัดตอนยืนยันกะ */
  inputStockMode?: string;
  stockAvailability?: Array<{
    itemId: string;
    itemCode?: string;
    itemNameTh?: string;
    plannedQty: string;
    availableQty: string;
    sufficient: boolean;
    shortfallQty: string;
  }>;
  remark?: string;
  requestedById?: string;
  requestedBy?: ProductionOrderUserSummary;
  startedById?: string;
  startedBy?: ProductionOrderUserSummary;
  startedAt?: string;
  completedById?: string;
  completedBy?: ProductionOrderUserSummary;
  completedAt?: string;
  inputItems: ProductionOrderInputItem[];
  planLines: ProductionOrderPlanLine[];
  downtimes: ProductionOrderDowntime[];
  logs: ProductionOrderLog[];
  sourceLines?: ProductionOrderSourceLine[];
  allocationSummary?: ProductionOrderAllocationSummary;
  createdAt: string;
  updatedAt: string;
};

export type ProductionOrderSourceLine = {
  id: string;
  productionRequestId: string;
  productionRequestNo?: string;
  productionRequestItemId: string;
  salesOrderId: string;
  salesOrderNo?: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  allocatedQty: string;
  fulfilledQty: string;
  remainingQty: string;
  sortOrder: number;
  remark?: string;
  isFulfilled: boolean;
};

export type ProductionOrderAllocationSummary = {
  totalApprovedOutputQty: string;
  totalAllocatedQty: string;
  unallocatedQty: string;
};

export type AllocateProductionOrderOutputLineBody = {
  sourceLineId: string;
  qtyToAllocate: number;
};

export type AllocateProductionOrderOutputBody = {
  lines: AllocateProductionOrderOutputLineBody[];
  reserveSalesOrders?: boolean;
};

export type AllocateProductionOrderOutputResult = {
  sourceLines: ProductionOrderSourceLine[];
  allocationSummary: ProductionOrderAllocationSummary;
  reserveResults: {
    salesOrderId: string;
    salesOrderNo?: string;
    reserved: boolean;
    message?: string;
  }[];
};

export type ProductionOrderOutputBreakdown = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  quantity: string;
};

export type ProductionOrderYieldCompareLine = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitCode?: string;
  plannedQty: string;
  actualQty: string;
  plannedYieldPercent: number;
  actualYieldPercent: number;
};

/** กระทบยอดผลผลิตต่อ (สินค้า, หน่วยนับ) — ผลิตจากกะที่ยืนยัน / รับเข้าคลังแล้ว / รอรับเข้าคลัง */
export type ProductionOrderOutputReconcileLine = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  confirmedShiftQty: string;
  approvedQty: string;
  pendingQty: string;
  /** รับเข้าคลังเกินยอดกะที่ยืนยัน (>0 = ผิดปกติ) */
  excessQty: string;
  isAnomaly: boolean;
};

export type ProductionOrderSummary = {
  productionOrderId: string;
  /** false = ใบตัดวัตถุดิบตอนเริ่มผลิต ไม่มีขั้นยืนยันกะ */
  outputReconcileApplicable?: boolean;
  outputReconcile?: ProductionOrderOutputReconcileLine[];
  totalPlannedInputQty: string;
  totalInputQty: string;
  totalPlannedOutputQty: string;
  totalOutputQty: string;
  totalPlannedWasteQty: string;
  totalActualWasteQty: string;
  plannedLaborHours?: string;
  yieldCompareByItem: ProductionOrderYieldCompareLine[];
  wasteLines: ProductionOrderPlanLine[];
  outputByItem: ProductionOrderOutputBreakdown[];
  yieldPercent: number;
  plannedYieldPercent: number;
  massBalanceDiff: string;
  actualCycleHours?: number;
  cycleTargetHours: string;
  totalDowntimeHours: number;
  /** ชั่วโมงของ Downtime ที่ยังเปิดค้าง — เดิม backend นับแถวที่ยังไม่ปิดเป็น 0 */
  openDowntimeHours: number;
  openDowntimeCount: number;
  /** เวลาที่ผ่านไปตั้งแต่เริ่มผลิต — มีค่าตั้งแต่ยังผลิตไม่เสร็จ */
  elapsedHours?: number;
  netRunHours?: number;
  cycleProgressPercent?: number;
  isOverdue: boolean;
  /**
   * ยอดรวมใช้หน่วยเดียวกันหรือไม่ — `false` แปลว่า yield/mass balance
   * เกิดจากการบวกข้ามหน่วย (เช่น น้ำมันเป็นลิตร ผงคาร์บอนเป็นกิโล)
   * หน้าจอต้องขึ้นคำเตือนแทนการโชว์ % เฉย ๆ
   */
  quantitiesComparable: boolean;
  unitCodes: string[];
  /** `EXCEEDS_INPUT` = ผลผลิตมากกว่าวัตถุดิบ เป็นไปไม่ได้ทางกายภาพ */
  massBalanceStatus: string;
  /** false = ห้ามเอาตัวเลข Yield ของใบนี้ไปเฉลี่ยรวม */
  yieldTrustworthy: boolean;
  massBalanceWarning?: string;
};

export type StartProductionOrderInputLineBody = {
  inputItemId: string;
  /** 0 = วางแผนไว้แต่ไม่ได้ใช้บรรทัดนี้ (ไม่ตัดสต๊อก) */
  actualQty: number;
  remark?: string;
};

/** ไม่ส่ง inputLines = ตัดตามแผนทุกบรรทัด (พฤติกรรมเดิม) */
export type StartProductionOrderBody = {
  inputLines?: StartProductionOrderInputLineBody[];
  leadOperatorId?: string;
  shiftId?: string;
};

export type CreateProductionOrderInputItemBody = {
  itemId: string;
  warehouseId?: string;
  locationId?: string;
  lotId?: string;
  unitId: string;
  plannedQty: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateProductionOrderPlanLineBody = {
  lineType: string;
  itemId: string;
  unitId: string;
  plannedQty: number;
  remark?: string;
  sortOrder?: number;
};

export type ProductionOrderMachine = {
  equipmentId: string;
  code: string;
  name: string;
  equipmentTypeId: string | null;
  equipmentTypeName: string | null;
  capacity: number | null;
  capacityUnitId: string | null;
  capacityUnitCode: string | null;
  capacityUnitLabel: string | null;
  /** เครื่องที่สูตรกำหนดไว้เดิม (ต่างจาก equipmentId = ผู้ใช้สลับเครื่อง) */
  formulaEquipmentId: string;
};

export type ProductionOrderMachineSnapshot = {
  machines: ProductionOrderMachine[];
};

/** สลับเครื่องที่สูตรกำหนดเป็นเครื่องอื่นประเภทเดียวกัน */
export type ProductionOrderMachineChoiceBody = {
  formulaEquipmentId: string;
  equipmentId: string;
};

export type CreateProductionOrderBody = {
  productionDate: string;
  /** วันสิ้นสุดช่วงผลิต — ไม่ส่งหรือเท่าวันเริ่ม = วันเดียว */
  productionDateEnd?: string;
  productionRequestId?: string;
  remark?: string;
  batchNo?: string;
  cycleTargetHours?: number;
  plannedLaborHours?: number;
  planLines: CreateProductionOrderPlanLineBody[];
  inputItems: CreateProductionOrderInputItemBody[];
  /** สูตรที่ใช้วางแผน — backend เก็บเลขรุ่นของสูตรให้เองจาก id นี้ */
  productionFormulaId?: string;
  formulaTargetQty?: number;
  formulaDriverItemId?: string;
  /** เฉพาะที่สลับจากเครื่องในสูตร (ไม่ส่ง = ใช้ตามสูตร) */
  machines?: ProductionOrderMachineChoiceBody[];
};

export type BulkCreateProductionOrderSelectionBody = {
  productionRequestId: string;
  productionRequestItemId: string;
  itemId: string;
  unitId: string;
  plannedQty: number;
  sortOrder?: number;
  remark?: string;
};

export type BulkCreateProductionOrdersBody = {
  productionDate: string;
  productionDateEnd?: string;
  batchNo?: string;
  remark?: string;
  cycleTargetHours?: number;
  plannedLaborHours?: number;
  /*
    ส่ง OUTPUT มาที่นี่ = บอกแผนของทั้งรอบเอง (เช่นคิดจากสูตร) ซึ่งจะชนะผลรวมของ
    `selections` · ส่งแต่ของเสีย = ระบบรวมผลผลิตจาก selections ให้เหมือนเดิม
  */
  sharedPlanLines: CreateProductionOrderPlanLineBody[];
  inputItems: CreateProductionOrderInputItemBody[];
  selections: BulkCreateProductionOrderSelectionBody[];
  productionFormulaId?: string;
  formulaTargetQty?: number;
  formulaDriverItemId?: string;
  machines?: ProductionOrderMachineChoiceBody[];
};

export type CompleteProductionOrderWasteLineBody = {
  planLineId?: string;
  itemId: string;
  unitId: string;
  actualQty: number;
  remark?: string;
};

export type CompleteProductionOrderBody = {
  signature: { typedName: string };
  wasteActualLines?: CompleteProductionOrderWasteLineBody[];
};

export type RecordDowntimeBody = {
  /** ไม่ส่ง = ใช้เวลาปัจจุบันฝั่ง server */
  startAt?: string;
  reason: string;
  category?: string;
  /** PLANNED = หยุดตามแผน · ไม่ส่ง = UNPLANNED (M5.8) */
  stopType?: "PLANNED" | "UNPLANNED";
  /** Root Cause (M5.8) */
  rootCause?: string;
};

export const PRODUCTION_STOP_TYPE_LABEL: Record<string, string> = {
  PLANNED: "หยุดตามแผน (Planned Stop)",
  UNPLANNED: "หยุดไม่ตามแผน (Unplanned / Breakdown)",
};

export type EndDowntimeBody = {
  endAt?: string;
};

/** หยุดเดินเครื่อง — เปิดแถว Downtime พร้อมกันในทรานแซกชันเดียว */
export type PauseProductionOrderBody = RecordDowntimeBody;

/** กลับมาเดินเครื่อง — ปิดแถว Downtime ที่เปิดค้างให้อัตโนมัติ */
export type ResumeProductionOrderBody = {
  endAt?: string;
};

/**
 * ยกเลิกใบสั่งผลิต — เหตุผลกับลายเซ็นบังคับเมื่อใบเดินอยู่แล้ว (กำลังผลิต/หยุดชั่วคราว)
 * ใบร่างส่ง body เปล่าได้
 */
export type CancelProductionOrderBody = {
  /** ชื่อฟิลด์ตรงกับ `CancelProductionOrderDto.cancelReason` ฝั่ง backend */
  cancelReason?: string;
  signature?: { typedName: string };
};

export type CreateProductionOrderLogBody = {
  note: string;
  loggedAt?: string;
};

export type QueryProductionOrdersParams = {
  orderNo?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ProductionOrderListData = {
  items: ProductionOrder[];
  total: number;
  page: number;
  limit: number;
};

export type ProductionOrderApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrder;
};

export type ProductionOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrderListData;
};

export type ProductionOrderSummaryApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrderSummary;
};

export const PRODUCTION_ORDER_OUTPUT_TREND_BUCKETS = ["DAY", "WEEK"] as const;
export type ProductionOrderOutputTrendBucket =
  (typeof PRODUCTION_ORDER_OUTPUT_TREND_BUCKETS)[number];

export type ProductionOrderOutputTrendParams = {
  from?: string;
  to?: string;
  bucket?: ProductionOrderOutputTrendBucket;
};

export type ProductionOrderOutputTrendByItem = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitCode?: string;
  qty: number;
};

export type ProductionOrderOutputTrendPoint = {
  bucket: string;
  actualOutputQty: number;
  cumulativeOutputQty: number;
  cumulativeYieldPercent: number | null;
  plannedYieldPercent: number | null;
  byItem: ProductionOrderOutputTrendByItem[];
};

export type ProductionOrderOutputTrendItem = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitCode?: string;
};

export type ProductionOrderOutputTrend = {
  productionOrderId: string;
  from: string;
  to: string;
  bucket: string;
  hasApprovedOutput: boolean;
  totalInputQty: string;
  quantitiesComparable: boolean;
  unitCodes: string[];
  massBalanceStatus: string;
  yieldTrustworthy: boolean;
  massBalanceWarning?: string;
  items: ProductionOrderOutputTrendItem[];
  points: ProductionOrderOutputTrendPoint[];
};

export type ProductionOrderOutputTrendApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrderOutputTrend;
};

export type ProductionOrderBulkCreateApiResponse = {
  statusCode?: number;
  message: string;
  data: {
    items: ProductionOrder[];
  };
};

export type ProductionOrderConsolidatedCreateApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrder;
};

export type AllocateProductionOrderOutputApiResponse = {
  statusCode?: number;
  message: string;
  data: AllocateProductionOrderOutputResult;
};
