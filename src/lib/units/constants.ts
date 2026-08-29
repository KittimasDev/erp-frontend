/** รหัสหน่วยกิโลกรัมในตาราง units — สายรับซื้อยางดิบชั่งเป็นกิโลกรัมโดยนิยามของ field */
export const KG_UNIT_CODE = "KG";

/**
 * ป้ายหน่วยน้ำหนักของสายยางดิบ
 * น้ำหนักมาจากเครื่องชั่ง (receivedWeightKg / payableWeightKg) จึงเป็นกิโลกรัมเสมอ
 * รวมไว้ที่เดียวแทนการ hardcode "กก." กระจายตามหน้าจอ
 */
export const RAW_TIRE_WEIGHT_UNIT_LABEL = "กก.";

export const UNIT_DIMENSIONS = [
  "MASS",
  "VOLUME",
  "COUNT",
  "LENGTH",
  "AREA",
  "TIME",
] as const;

export type UnitDimension = (typeof UNIT_DIMENSIONS)[number];

export const UNIT_DIMENSION_LABELS: Record<UnitDimension, string> = {
  MASS: "น้ำหนัก",
  VOLUME: "ปริมาตร",
  COUNT: "จำนวนนับ",
  LENGTH: "ความยาว",
  AREA: "พื้นที่",
  TIME: "เวลา",
};
