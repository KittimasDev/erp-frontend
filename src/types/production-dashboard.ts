/**
 * แดชบอร์ดการผลิต — 4 endpoint แยกกันเพราะจังหวะรีเฟรชต่างกันจริง
 * กระดานงานสด poll ทุก 30 วินาที ส่วนที่เหลือเป็น aggregate 30 วัน
 */

export type ProductionDashboardBucket = "DAY" | "WEEK" | "MONTH";

export type ProductionDashboardKpi = {
  completedOrders: number;
  inProgressOrders: number;
  pausedOrders: number;
  /**
   * `null` เมื่อไม่มีใบไหนที่หน่วยเทียบกันได้เลย
   * (เตาให้น้ำมันเป็นลิตร ผงคาร์บอนเป็นกิโล — ไม่มีตารางแปลงไหนรวมเป็นตัวเลขเดียวได้)
   */
  averageYieldPercent: number | null;
  /** จำนวนใบที่ถูกตัดออกจากค่าเฉลี่ยทั้งหมด (ผสมหน่วย + ตัวเลขเป็นไปไม่ได้) */
  yieldExcludedOrders: number;
  /** ในจำนวนนั้น กี่ใบที่ผลผลิตมากกว่าวัตถุดิบ — พวกนี้ต้องมีคนไปแก้ข้อมูล */
  yieldImpossibleOrders: number;
  totalDowntimeHours: number;
  openDowntimeCount: number;
};

export type ProductionDashboardTrendPoint = {
  bucket: string;
  completedOrders: number;
  actualOutputQty: number;
  plannedOutputQty: number;
  yieldPercent: number | null;
  plannedYieldPercent: number | null;
};

export type ProductionDashboardSummary = {
  from: string;
  to: string;
  bucket: string;
  kpi: ProductionDashboardKpi;
  trend: ProductionDashboardTrendPoint[];
};

export type ProductionWorkInProgressRow = {
  id: string;
  orderNo: string;
  batchNo?: string;
  status: string;
  isPaused: boolean;
  startedAt?: string;
  elapsedHours: number;
  netRunHours: number;
  downtimeHours: number;
  cycleTargetHours?: number;
  cycleProgressPercent: number | null;
  isOverdue: boolean;
  openDowntimeReason?: string;
  openDowntimeCategory?: string;
};

export type ProductionWorkInProgress = {
  rows: ProductionWorkInProgressRow[];
  asOf: string;
};

export type ProductionDowntimeGroup = {
  category: string | null;
  label: string;
  hours: number;
  occurrences: number;
  /** สัดส่วนสะสม — backend คิดมาให้แล้ว frontend ไม่ต้องมีสูตร Pareto ซ้ำ */
  cumulativePercent: number;
};

export type ProductionDowntimeReason = {
  reason: string;
  hours: number;
  occurrences: number;
};

export type ProductionDowntimeSummary = {
  from: string;
  to: string;
  totalHours: number;
  byCategory: ProductionDowntimeGroup[];
  topReasons: ProductionDowntimeReason[];
};

export type ProductionStageProgressRow = {
  stageType: string;
  label: string;
  sequenceNo: number;
  completedRuns: number;
  inProgressRuns: number;
  draftRuns: number;
};

export type ProductionBatchProgress = {
  batchNo: string | null;
  label: string;
  latestStageType: string;
  latestStageLabel: string;
  latestSequenceNo: number;
  latestRunDate: string;
  latestStatus: string;
};

export type ProductionStageProgress = {
  from: string;
  to: string;
  /** ครบ 14 ขั้นเสมอ รวมขั้นที่ยังไม่มีงาน — ช่องว่างคือสัญญาณ */
  stages: ProductionStageProgressRow[];
  batches: ProductionBatchProgress[];
};

export type ProductionDashboardRangeParams = {
  from?: string;
  to?: string;
};

export type ProductionDashboardSummaryParams =
  ProductionDashboardRangeParams & {
    bucket?: ProductionDashboardBucket;
  };

type ApiEnvelope<T> = { statusCode: number; message: string; data: T };

export type ProductionDashboardSummaryApiResponse =
  ApiEnvelope<ProductionDashboardSummary>;
export type ProductionWorkInProgressApiResponse =
  ApiEnvelope<ProductionWorkInProgress>;
export type ProductionDowntimeApiResponse =
  ApiEnvelope<ProductionDowntimeSummary>;
export type ProductionStageProgressApiResponse =
  ApiEnvelope<ProductionStageProgress>;
