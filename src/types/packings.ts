import { getStoredLanguage, type Language } from "@/lib/i18n/language";
import { translate } from "@/lib/i18n/translate";
import {
  STANDARD_STATUS,
  standardStatusColor,
  standardStatusLabel,
} from "@/lib/status/standard-status";

export type PackingStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export const PACKING_STATUS_LABEL: Record<PackingStatus, string> = {
  DRAFT: STANDARD_STATUS.DRAFT.th,
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: STANDARD_STATUS.CANCELLED.th,
};

/** ป้ายสถานะตามภาษา — แบบร่าง/ยกเลิก ใช้ชื่อมาตรฐานกลาง */
export function packingStatusLabel(status: string, lang?: Language): string {
  const l = lang ?? getStoredLanguage();
  if (status === "DRAFT") return standardStatusLabel("DRAFT", l);
  if (status === "CANCELLED") return standardStatusLabel("CANCELLED", l);
  return translate(l, PACKING_STATUS_LABEL[status as PackingStatus] ?? status);
}

/** สีป้ายสถานะ — แบบร่าง/ยกเลิก = เทา (มาตรฐาน), ยืนยันแล้ว = เขียว (เดิม) */
export function packingStatusColor(status: string): string {
  if (status === "DRAFT") return standardStatusColor("DRAFT");
  if (status === "CANCELLED") return standardStatusColor("CANCELLED");
  return status === "CONFIRMED" ? "success" : "default";
}

export type PackingItem = {
  id: string;
  pickingItemId: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  packedQty: string;
  unitId: string;
  unitCode?: string;
  packageNo?: string;
  remark?: string;
  sortOrder: number;
};

export type Packing = {
  id: string;
  packingNo: string;
  pickingId: string;
  pickingNo?: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId?: string;
  customerName?: string;
  packingDate: string;
  packageType?: string;
  /** Tank Loading: ใบจ่ายน้ำมันจากถังที่ผูกไว้ */
  oilDispatchId?: string | null;
  oilDispatchNo?: string;
  packageCount?: number;
  grossWeight?: string;
  netWeight?: string;
  status: PackingStatus | string;
  remark?: string;
  createdByName?: string;
  confirmedAt?: string;
  items: PackingItem[];
  createdAt: string;
  updatedAt: string;
};

export type ReadyPicking = {
  id: string;
  pickingNo: string;
  pickingDate: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId?: string;
  customerName?: string;
  itemCount: number;
  status: string;
};

export type PackingQueryParams = {
  keyword?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
};

export type CreatePackingFromPickingBody = {
  packingDate?: string;
  packageType?: string;
  packageCount?: number;
  grossWeight?: number;
  netWeight?: number;
  remark?: string;
};

export type UpdatePackingBody = {
  packingDate?: string;
  packageType?: string;
  oilDispatchId?: string | null;
  packageCount?: number;
  grossWeight?: number;
  netWeight?: number;
  remark?: string;
  items?: Array<{
    id: string;
    packedQty?: number;
    packageNo?: string;
    remark?: string;
  }>;
};

export type PackingApiResponse = {
  statusCode?: number;
  message: string;
  data: Packing;
};

export type PackingListApiResponse = {
  statusCode?: number;
  message: string;
  data: Packing[];
};

export type ReadyPickingListApiResponse = {
  statusCode?: number;
  message: string;
  data: ReadyPicking[];
};

/** ประเภทบรรจุภัณฑ์มาตรฐาน — เก็บเป็นรหัส · ข้อมูลเก่าที่เป็นข้อความอิสระยังแสดงตามเดิม */
export const PACKAGE_TYPE_OPTIONS = [
  { value: "BIG_BAG", label: "Big Bag" },
  { value: "BAG", label: "Bag (ถุง)" },
  { value: "TANK", label: "Tank Loading (บรรจุลงถัง/รถบรรทุกถัง)" },
  { value: "DRUM", label: "ถังบรรจุ (Drum)" },
  { value: "PALLET", label: "พาเลท" },
  { value: "BOX", label: "กล่อง" },
  { value: "OTHER", label: "อื่น ๆ" },
] as const;

export function packageTypeLabel(value?: string | null): string {
  if (!value) return "—";
  return PACKAGE_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
