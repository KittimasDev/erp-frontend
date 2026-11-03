/**
 * สูตรการผลิต — "1 รอบใช้อะไรเท่าไหร่ แล้วได้อะไรออกมาเท่าไหร่"
 *
 * สูตรเก็บ **จำนวนจริงต่อ 1 รอบอ้างอิง** ไม่ใช่สัดส่วน · เวลาใช้ ผู้ใช้เลือกบรรทัด
 * ที่จะใช้เป็นตัวตั้งแล้วใส่จำนวนที่ต้องการ ระบบคูณทุกบรรทัดด้วยตัวคูณเดียวกัน
 * → ตั้งจากผลผลิตหรือจากวัตถุดิบก็ได้ด้วยเลขคณิตชุดเดียว
 *
 * **การคำนวณอยู่ฝั่ง backend ทั้งหมด** (`GET :id/scale`) ไม่ลอกมาไว้ที่นี่
 * เพราะ frontend ไม่มี test runner กฎที่บั๊กมักอยู่จะไม่มีอะไรคุม
 */

export const FORMULA_LINE_ROLES = ["INPUT", "OUTPUT", "WASTE"] as const;
export type FormulaLineRole = (typeof FORMULA_LINE_ROLES)[number];

export const FORMULA_LINE_ROLE_LABEL: Record<string, string> = {
  INPUT: "วัตถุดิบที่ต้องใช้",
  OUTPUT: "ผลผลิตที่ได้",
  WASTE: "ของเสีย (ไม่เข้าคลัง)",
};

export const FORMULA_LINE_ROLE_COLOR: Record<string, string> = {
  INPUT: "blue",
  OUTPUT: "green",
  WASTE: "default",
};

export type ProductionFormulaMassBalance = {
  /** เท็จเมื่อบรรทัดในสูตรใช้หลายหน่วย — ตัวเลขรวมข้ามหน่วยไม่มีความหมาย */
  comparable: boolean;
  inputTotal: number;
  outputTotal: number;
  wasteTotal: number;
  /** เข้า − ออก − ของเสีย · 0 = สูตรปิด */
  diff: number;
};

export type ProductionFormulaLine = {
  id: string;
  lineRole: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  quantity: string;
  isDefaultDriver: boolean;
  remark?: string;
  sortOrder: number;
};

export const RECORDING_CALC_TYPES = [
  "DIRECT",
  "METER_DELTA",
  "HOURS_TIMES_RATE",
  "QTY_TIMES_UNIT_WEIGHT",
  "INFORMATION",
] as const;
export type RecordingCalcType = (typeof RECORDING_CALC_TYPES)[number];

export const RECORDING_CALC_TYPE_LABEL: Record<RecordingCalcType, string> = {
  DIRECT: "กรอกตัวเลขโดยตรง",
  METER_DELTA: "มิเตอร์สะสม (ปลายกะ − ต้นกะ)",
  HOURS_TIMES_RATE: "ชั่วโมงทำงาน × อัตรา",
  QTY_TIMES_UNIT_WEIGHT: "จำนวน × น้ำหนักต่อหน่วย",
  INFORMATION: "ข้อมูลประกอบ",
};

export const RECORDING_RESULT_ROLES = [
  "INPUT",
  "OUTPUT",
  "TRACKING",
  "INFORMATION",
] as const;
export type RecordingResultRole = (typeof RECORDING_RESULT_ROLES)[number];

export const RECORDING_RESULT_ROLE_LABEL: Record<RecordingResultRole, string> = {
  INPUT: "Input — วัตถุดิบใน BOM",
  OUTPUT: "Output — ผลผลิตใน BOM",
  TRACKING: "Tracking — ติดตาม (เช่น Silo)",
  INFORMATION: "Information — ข้อมูลประกอบ",
};

export type RecordingInfoValueKind =
  | "NUMBER"
  | "TEXT"
  | "TEMPERATURE"
  | "RPM"
  | "QC";

/**
 * แหล่งข้อมูลของฟิลด์ — แยกจากวิธีคำนวณ (calcType) โดยตั้งใจ
 * MANUAL = พนักงานกรอกหลังจบกะ (ใช้งานจริงตอนนี้) · AUTO = รับจากเครื่องจักร (รอพัฒนา Machine Integration)
 */
export const RECORDING_DATA_SOURCES = ["MANUAL", "AUTO"] as const;
export type RecordingDataSource = (typeof RECORDING_DATA_SOURCES)[number];

export const RECORDING_DATA_SOURCE_LABEL: Record<RecordingDataSource, string> = {
  MANUAL: "กรอกด้วยมือ",
  AUTO: "อัตโนมัติจากเครื่อง (รอพัฒนา)",
};

export type RecordingFieldDef = {
  id: string;
  sortOrder: number;
  code: string;
  label: string;
  unitLabel?: string;
  required: boolean;
  calcType: RecordingCalcType;
  infoValueKind?: RecordingInfoValueKind;
  resultRole: RecordingResultRole;
  linkedLineRole?: "INPUT" | "OUTPUT" | null;
  linkedItemId?: string | null;
  stockUnitId?: string | null;
  unitToStockFactor?: number | null;
  /** เครื่องจักรที่ฟิลด์นี้บันทึกค่า (equipment.id) — ไม่ผูก = ฟิลด์ทั่วไป */
  equipmentId?: string | null;
  /** MANUAL (default) / AUTO */
  dataSource?: RecordingDataSource;
  /** Device Tag (machine_tags.tag_code) เมื่อ dataSource = AUTO — เก็บเป็นรหัสเพื่อจับคู่ใหม่ได้เมื่อสลับเครื่องใน MO */
  deviceTagCode?: string | null;
  /** true = ผลของฟิลด์นี้คือ "ผลจริง" ที่ใช้เทียบ Capacity × ชั่วโมงเดินเครื่อง (1 ฟิลด์ต่อเครื่อง) */
  compareToCapacity?: boolean;
};

export type ProductionRecordingConfig = {
  fields: RecordingFieldDef[];
  /** เครื่องจักรที่สูตรนี้ใช้ (equipment.id) */
  equipmentIds?: string[];
};

export type ProductionFormula = {
  id: string;
  formulaCode: string;
  nameTh: string;
  description?: string;
  batchLabel?: string;
  /** บวกขึ้นเมื่อบรรทัดหรือ recording config เปลี่ยน */
  versionNo: number;
  isActive: boolean;
  sortOrder: number;
  remark?: string;
  recordingConfig?: ProductionRecordingConfig;
  lines: ProductionFormulaLine[];
  massBalance: ProductionFormulaMassBalance;
  /** คำเตือนที่ไม่บล็อกการบันทึก */
  warnings: string[];
  /** มากกว่า 0 = ลบไม่ได้ ต้องปิดใช้งานแทน */
  usedByOrderCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProductionFormulaScaleLine = {
  lineId: string;
  lineRole: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  /** จำนวนต่อ 1 รอบตามสูตร */
  formulaQty: number;
  /** จำนวนประมาณการที่คิดได้ */
  plannedQty: number;
  isDriver: boolean;
};

export type ProductionFormulaScale = {
  formulaId: string;
  formulaCode: string;
  versionNo: number;
  /** `null` = คิดไม่ได้ ดู `reason` */
  factor: number | null;
  reason?: string;
  lines: ProductionFormulaScaleLine[];
  /**
   * บรรทัดที่ปัดแล้วเหลือ 0 — ส่งไปสร้างใบสั่งผลิตจะถูกปฏิเสธทั้งใบ
   * เพราะ `@Min(0.001)` หน้าจอต้องเตือนก่อน
   */
  roundedToZeroLineIds: string[];
  massBalance: ProductionFormulaMassBalance;
};

export type ProductionFormulaLineBody = {
  lineRole: string;
  itemId: string;
  unitId?: string;
  quantity: number;
  isDefaultDriver?: boolean;
  remark?: string;
  sortOrder?: number;
};

export type CreateProductionFormulaBody = {
  formulaCode: string;
  nameTh: string;
  description?: string;
  batchLabel?: string;
  isActive?: boolean;
  sortOrder?: number;
  remark?: string;
  recordingConfig?: ProductionRecordingConfig;
  lines: ProductionFormulaLineBody[];
};

/** ส่ง `lines` มาคือแทนที่ทั้งชุด ไม่ส่งคือไม่แตะ */
export type UpdateProductionFormulaBody = Partial<
  Omit<CreateProductionFormulaBody, "formulaCode" | "lines">
> & { lines?: ProductionFormulaLineBody[]; recordingConfig?: ProductionRecordingConfig };

export type QueryProductionFormulasParams = {
  search?: string;
  isActive?: boolean;
};

type ApiEnvelope<T> = { statusCode: number; message: string; data: T };

export type ProductionFormulaApiResponse = ApiEnvelope<ProductionFormula>;
export type ProductionFormulaListApiResponse = ApiEnvelope<ProductionFormula[]>;
export type ProductionFormulaScaleApiResponse =
  ApiEnvelope<ProductionFormulaScale>;
