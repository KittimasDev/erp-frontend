import type { Unit } from "./units";

export type UnitConversionItemRef = {
  id: string;
  itemCode: string;
  itemNameTh: string;
};

/**
 * กฎแปลงหน่วยนับ
 * ความหมายของ factor: 1 fromUnit = factor x toUnit (เช่น 1 มัด = 25 กก. -> from=มัด, to=กก., factor=25)
 * ทิศย้อนกลับระบบคำนวณ 1/factor ให้เอง ไม่ต้องตั้งสองแถว
 */
export type UnitConversion = {
  id: string;
  /** null = กฎกลางใช้ได้ทุกสินค้า */
  itemId: string | null;
  item?: UnitConversionItemRef | null;
  fromUnitId: string;
  fromUnit?: Unit;
  toUnitId: string;
  toUnit?: Unit;
  /** decimal จาก backend มาเป็น string เสมอ ต้อง Number() ก่อนคำนวณ */
  factor: string;
  isActive: boolean;
  remark?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateUnitConversionRequest = {
  itemId?: string | null;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
  isActive?: boolean;
  remark?: string;
};

/** ห้ามย้ายกฎข้ามสินค้า — backend ตัด itemId ออกจาก payload แก้ไขโดยตั้งใจ */
export type UpdateUnitConversionRequest = Partial<
  Omit<CreateUnitConversionRequest, "itemId">
>;

export type UnitConversionScope = "ALL" | "GLOBAL" | "ITEM";

export type UnitConversionQueryParams = {
  itemId?: string;
  fromUnitId?: string;
  toUnitId?: string;
  scope?: UnitConversionScope;
  isActive?: boolean;
};

export type UnitConversionApiResponse = {
  message: string;
  data: UnitConversion;
};

export type UnitConversionListApiResponse = {
  message: string;
  data: UnitConversion[];
};

export type ConvertibleUnitsApiResponse = {
  message: string;
  data: Unit[];
};

/** สถานะสวิตช์ระดับระบบ — มาจาก env UNIT_CONVERSION_ENABLED ฝั่ง backend */
export type UnitConversionSettings = {
  enabled: boolean;
  maxPathDepth: number;
};

export type UnitConversionSettingsApiResponse = {
  statusCode?: number;
  message: string;
  data: UnitConversionSettings;
};
