import { tNow } from "@/lib/i18n/useT";

/**
 * ค่าที่แตกต่างกันระหว่าง "ขั้นตอนเตรียมยาง" กับ "กระบวนการผลิต rCB"
 *
 * backend สองโมดูลนี้เหมือนกันทุกฟิลด์ ต่างแค่ path, ชุดขั้นตอน และข้อความไทย
 * ฝั่งหน้าเว็บจึงใช้คอมโพเนนต์ชุดเดียวแล้วส่ง config เข้าไป — ถ้าทำสองชุดจะได้
 * ไฟล์ฟอร์ม cascade คลัง→ตำแหน่ง→lot ยาว ๆ สองไฟล์ที่แตกกันภายในไม่กี่เดือน
 *
 * `stageTypes` เป็นแหล่งเดียวของป้ายชื่อขั้นตอน ใช้ทั้ง filter ฟอร์ม หน้ารายละเอียด
 * และกราฟความคืบหน้าบน dashboard — ป้ายจึงไม่มีทางแตกกัน
 */

export type StageTypeOption = {
  value: string;
  label: string;
  /** ลำดับในสายการผลิตทั้งหมด 14 ขั้น (เตรียมยาง 1–6 · ไพโรไลซิส 10 · rCB 21–27) */
  order: number;
};

export type StageModuleKey = "tire-prep" | "rcb";

export type StageModuleConfig = {
  key: StageModuleKey;
  /** ใช้กับ useScreenActionPermissions และการเช็คสิทธิ์ปุ่ม */
  screenCode: "TIRE_PREP_STAGES" | "RCB_PROCESSING";
  /** path ของ API — ห้ามเปลี่ยน */
  apiBase: string;
  /** prefix ของ route ฝั่งหน้าเว็บ */
  routeBase: string;
  /** root ของ react-query key */
  queryKeyRoot: readonly string[];
  headerAccent: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  runNoPlaceholder: string;
  /** ของพลอยได้ที่แยกได้ระหว่างทาง — บันทึกอ้างอิงเท่านั้น ไม่เข้าสต๊อก */
  byproductLabel: string;
  stageTypes: readonly StageTypeOption[];
};

export const TIRE_PREP_STAGE_TYPES: readonly StageTypeOption[] = [
  { value: "TIRE_CUTTING", label: "ตัดยาง", order: 1 },
  { value: "BEAD_WIRE_REMOVAL", label: "ถอดลวดขอบยาง", order: 2 },
  { value: "STEEL_WIRE_WEIGHING", label: "ชั่งลวดเหล็ก", order: 3 },
  { value: "PRIMARY_SHREDDING", label: "ย่อยหยาบ", order: 4 },
  { value: "SECONDARY_SHREDDING", label: "ย่อยละเอียด", order: 5 },
  { value: "FEED_HOPPER", label: "ป้อนเข้าถังพัก", order: 6 },
];

export const RCB_STAGE_TYPES: readonly StageTypeOption[] = [
  { value: "MAGNETIC_SEPARATION", label: "แยกด้วยแม่เหล็ก", order: 21 },
  { value: "STEEL_FINES_RECOVERY", label: "เก็บผงเหล็ก", order: 22 },
  { value: "GRINDING", label: "บด", order: 23 },
  { value: "CHEMICAL_MIXING", label: "ผสมสารเคมี", order: 24 },
  { value: "PELLETIZING", label: "อัดเม็ด", order: 25 },
  { value: "DRYING", label: "อบแห้ง", order: 26 },
  { value: "PACKING", label: "บรรจุ", order: 27 },
];

export const TIRE_PREP_MODULE: StageModuleConfig = {
  key: "tire-prep",
  screenCode: "TIRE_PREP_STAGES",
  apiBase: "/api/production/tire-prep-stages",
  routeBase: "/production/tire-prep-stages",
  queryKeyRoot: ["tire-prep-stages"],
  headerAccent: "TP",
  eyebrow: "PRODUCTION · TIRE PREPARATION",
  title: "ขั้นตอนเตรียมยาง",
  subtitle:
    "ยางทั้งเส้นเข้าเตาไม่ได้ ต้องผ่าน 6 ขั้นก่อน — ตัดยาง ถอดลวด ชั่งลวด ย่อยหยาบ ย่อยละเอียด ป้อนเข้าถังพัก",
  runNoPlaceholder: "ค้นหาเลขที่รอบ เช่น TPS-20260723-001",
  byproductLabel: "ลวดเหล็กที่แยกได้",
  stageTypes: TIRE_PREP_STAGE_TYPES,
};

export const RCB_MODULE: StageModuleConfig = {
  key: "rcb",
  screenCode: "RCB_PROCESSING",
  apiBase: "/api/production/rcb-processing",
  routeBase: "/production/rcb-processing",
  queryKeyRoot: ["rcb-processing"],
  headerAccent: "RCB",
  eyebrow: "PRODUCTION · rCB",
  title: "กระบวนการผลิต rCB",
  subtitle:
    "ผงคาร์บอนดิบจากเตายังขายราคาดีไม่ได้ ต้องผ่านอีก 7 ขั้น — แยกแม่เหล็ก เก็บผงเหล็ก บด ผสมเคมี อัดเม็ด อบแห้ง บรรจุ",
  runNoPlaceholder: "ค้นหาเลขที่รอบ เช่น RCB-20260723-001",
  byproductLabel: "ผงเหล็กที่แยกได้",
  stageTypes: RCB_STAGE_TYPES,
};

export function stageTypeLabel(
  config: StageModuleConfig,
  stageType?: string,
): string {
  if (!stageType) return "-";
  const label = config.stageTypes.find((option) => option.value === stageType)?.label;
  return label ? tNow(label) : stageType;
}
