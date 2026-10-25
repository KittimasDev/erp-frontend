import type { UnitDimension } from "@/lib/units/constants";

export type Unit = {
  id: string;
  code: string;
  nameTh: string;
  nameEn?: string;
  /** มิติของหน่วย — ใช้เตือนตอนตั้งกฎแปลงหน่วยกลางข้ามมิติเท่านั้น ว่างได้ */
  dimension?: string | null;
  decimalPlaces?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** ⚠️ ฟิลด์ request ไม่ตรงกับ response: name/symbol ที่นี่ = nameTh/nameEn ฝั่ง response */
export type CreateUnitRequest = {
  code: string;
  name: string;
  symbol?: string;
  dimension?: UnitDimension;
  decimalPlaces?: number;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateUnitRequest = Partial<CreateUnitRequest>;

export type UnitApiResponse = {
  message: string;
  data: Unit;
};

export type UnitListApiResponse = {
  message: string;
  data: Unit[];
};
