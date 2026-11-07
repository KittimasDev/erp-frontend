import { getStoredLanguage } from "@/lib/i18n/language";
export type WarehouseLocation = {
  id: string;
  warehouseId: string;
  locationCode: string;
  locationName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseLocationQueryParams = {
  warehouseId?: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateWarehouseLocationRequest = {
  warehouseId: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
  parentLocationId?: string;
};

export type UpdateWarehouseLocationRequest =
  Partial<CreateWarehouseLocationRequest>;

export type WarehouseLocationApiResponse = {
  statusCode: number;
  message: string;
  data: WarehouseLocation;
};

export type WarehouseLocationListApiResponse = {
  statusCode: number;
  message: string;
  data: WarehouseLocation[];
};

/**
 * คำที่ชนกับ "ตำแหน่ง" (ตำแหน่งงาน ใน masters-admin) — ในหน้านี้ตำแหน่ง = storage location
 * จึงแยกคำแปลไว้ที่นี่ (เรียกตอนเรนเดอร์ในคอมโพเนนต์ที่ใช้ useT()/useLanguage() อยู่แล้ว)
 */
const LOCATION_EN: Record<string, string> = {
  "กรุณากรอกชื่อตำแหน่ง": "Please enter the location name",
  "กรุณากรอกรหัสตำแหน่ง": "Please enter the location code",
  "ชื่อตำแหน่ง": "Location name",
  "ตำแหน่งทั้งหมด": "All locations",
  "รหัสตำแหน่ง": "Location code",
};

export function tLoc(thai: string): string {
  return getStoredLanguage() === "en" ? (LOCATION_EN[thai] ?? thai) : thai;
}
