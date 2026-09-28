/**
 * รอบการทำงานของขั้นตอนการผลิต — ใช้ร่วมกันทั้งเตรียมยางและ rCB
 *
 * backend เป็นสองโมดูลแยกกัน (`tire_prep_stage_runs` / `rcb_processing_runs`)
 * แต่ DTO ทั้ง create / query / response **เหมือนกันทุกฟิลด์** ต่างแค่ค่าที่ใส่
 * ใน `stageType` — ฝั่งหน้าเว็บจึงใช้ type ชุดเดียว แล้วแยกด้วย config แทน
 */

export const StageRunStatus = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type StageRunStatusValue =
  (typeof StageRunStatus)[keyof typeof StageRunStatus];

export const STAGE_RUN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  IN_PROGRESS: "กำลังทำงาน",
  COMPLETED: "เสร็จแล้ว",
  CANCELLED: "ยกเลิก",
};

export const STAGE_RUN_STATUS_COLOR: Record<string, string> = {
  DRAFT: "default",
  IN_PROGRESS: "processing",
  COMPLETED: "success",
  CANCELLED: "error",
};

export type StageRunUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type StageRun = {
  id: string;
  runNo: string;
  stageType: string;
  runDate: string;
  status: string;
  /** ว่างสำหรับแถวเก่าที่ backfill ไม่ได้ — จัดกลุ่มเป็น "ไม่ระบุ Batch" */
  batchNo?: string;
  /** ลำดับในสายการผลิต 14 ขั้น (เตรียมยาง 1-6 · ไพโรไลซิส 10 · rCB 21-27) */
  sequenceNo?: number;
  productionOrderId?: string;

  inputItemId: string;
  inputItemCode?: string;
  inputItemNameTh?: string;
  inputWarehouseId: string;
  inputLocationId: string;
  inputLotId?: string;
  inputUnitId: string;
  /** จำนวนตามแผน */
  inputQty: string;
  /** จำนวนที่ตัดสต๊อกจริงตอนกดเริ่มงาน — '0.000' จนกว่าจะเริ่ม */
  inputActualQty: string;

  outputItemId: string;
  outputItemCode?: string;
  outputItemNameTh?: string;
  outputWarehouseId: string;
  outputLocationId: string;
  outputUnitId: string;
  /** จำนวนตามแผน — ห้ามใช้แทนของจริง เป็นฐานเทียบ variance ตัวเดียวที่มี */
  outputQty: string;
  /** ผลผลิตที่รับเข้าคลังจริง — ว่างจนกว่าจะปิดงาน */
  outputActualQty?: string;
  outputLotNo?: string;

  /**
   * Yield ที่ backend คิดให้ — `null` เมื่อหน่วย input กับ output ต่างกัน
   * ใช้ค่านี้แทนการคำนวณเองบนหน้าจอ สูตรจะได้อยู่ที่เดียว
   */
  yieldPercent: number | null;
  yieldComparable: boolean;

  byproductQty?: string;
  remark?: string;

  requestedById?: string;
  requestedBy?: StageRunUserSummary;
  startedById?: string;
  startedAt?: string;
  completedById?: string;
  completedAt?: string;
  cancelledById?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type StageRunListData = {
  items: StageRun[];
  total: number;
  page: number;
  limit: number;
};

export type StageRunApiResponse = {
  statusCode: number;
  message: string;
  data: StageRun;
};

export type StageRunListApiResponse = {
  statusCode: number;
  message: string;
  data: StageRunListData;
};

export type QueryStageRunsParams = {
  runNo?: string;
  stageType?: string;
  status?: string;
  batchNo?: string;
  productionOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateStageRunBody = {
  stageType: string;
  runDate: string;
  batchNo?: string;
  productionOrderId?: string;
  inputItemId: string;
  inputWarehouseId: string;
  inputLocationId: string;
  inputLotId: string;
  inputUnitId: string;
  inputQty: number;
  outputItemId: string;
  outputWarehouseId: string;
  outputLocationId: string;
  outputUnitId: string;
  outputQty: number;
  byproductQty?: number;
  remark?: string;
};

/** ปิดงาน — ไม่ส่ง `outputActualQty` = รับเข้าคลังตามแผน (พฤติกรรมเดิม) */
export type CompleteStageRunBody = {
  outputActualQty?: number;
  remark?: string;
};

/** ยกเลิก — เหตุผลบังคับเมื่อรอบนั้นเริ่มงาน (ตัดสต๊อก) ไปแล้ว */
export type CancelStageRunBody = {
  cancelReason?: string;
};

/**
 * Yield ของตัวเลขที่ยังไม่ได้บันทึก — ใช้เฉพาะ **preview บนฟอร์มสร้าง**
 *
 * รอบที่บันทึกแล้วให้อ่าน `yieldPercent` / `yieldComparable` ที่ backend ส่งมา
 * (สูตรเดียวกันอยู่ที่ `stage-run-yield.util.ts` ฝั่ง backend) ไม่ต้องคิดซ้ำ
 *
 * **คืน `null` เมื่อหน่วย input กับ output ต่างกัน** ซึ่งเป็นเรื่องปกติของขั้นตอน
 * เตรียมยาง (ตัดยาง = เส้น → กิโล) การโชว์ `2125%` แย่กว่าการบอกว่าเทียบไม่ได้
 */
export function stageRunYield(run: {
  inputQty: string;
  inputActualQty: string;
  outputQty: string;
  inputUnitId: string;
  outputUnitId: string;
}): { percent: number | null; comparable: boolean; isPlanned: boolean } {
  const comparable = run.inputUnitId === run.outputUnitId;
  const actual = Number(run.inputActualQty) || 0;
  const isPlanned = actual <= 0;
  const base = isPlanned ? Number(run.inputQty) || 0 : actual;
  const output = Number(run.outputQty) || 0;

  if (!comparable || base <= 0) {
    return { percent: null, comparable, isPlanned };
  }
  return {
    percent: Number(((output / base) * 100).toFixed(2)),
    comparable,
    isPlanned,
  };
}
