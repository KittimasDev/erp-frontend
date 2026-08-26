export type PickingStatus = "DRAFT" | "CONFIRMED" | "CANCELLED";

export const PICKING_STATUS_LABEL: Record<PickingStatus, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export type PickingItem = {
  id: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  requiresLotControl?: boolean;
  warehouseId?: string;
  warehouseCode?: string;
  locationId?: string;
  locationCode?: string;
  lotId?: string;
  lotNo?: string;
  orderedQty: string;
  pickedQty: string;
  unitId: string;
  unitCode?: string;
  remark?: string;
  sortOrder: number;
};

export type Picking = {
  id: string;
  pickingNo: string;
  salesOrderId: string;
  salesOrderNo?: string;
  customerId?: string;
  customerName?: string;
  pickingDate: string;
  status: PickingStatus | string;
  remark?: string;
  createdByName?: string;
  confirmedAt?: string;
  items: PickingItem[];
  createdAt: string;
  updatedAt: string;
};

/**
 * รอบจัดส่งที่พร้อมให้คลังเปิดใบจ่าย
 *
 * ชื่อ type ยังเป็น ReadySalesOrder ตามเดิมเพื่อไม่ต้องแก้ทุกที่ที่อ้างถึง
 * แต่ **1 แถว = 1 รอบ ไม่ใช่ 1 ใบสั่งขาย** — SO ใบเดียวโผล่ได้หลายแถว
 * ดังนั้น key ของตารางต้องใช้ deliveryScheduleId ไม่ใช่ id (ซึ่งซ้ำได้)
 */
export type ReadySalesOrder = {
  /** รหัสใบสั่งขายต้นทาง — ซ้ำได้เมื่อ SO ใบเดียวมีหลายรอบ */
  id: string;
  /** รหัสรอบจัดส่ง — ตัวนี้ไม่ซ้ำ ใช้เป็น rowKey และใช้สร้างใบจ่าย */
  deliveryScheduleId: string;
  roundNo: number;
  deliveryDate: string;
  soNo: string;
  soDate: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  itemCount: number;
  status: string;
};

export type PickingQueryParams = {
  keyword?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
};

export type CreatePickingFromSalesOrderBody = {
  pickingDate?: string;
  remark?: string;
};

export type UpdatePickingBody = {
  pickingDate?: string;
  remark?: string;
  items?: Array<{
    id: string;
    warehouseId?: string;
    locationId?: string;
    lotId?: string | null;
    pickedQty?: number;
    remark?: string;
  }>;
};

export type PickingApiResponse = {
  statusCode?: number;
  message: string;
  data: Picking;
};

export type PickingListApiResponse = {
  statusCode?: number;
  message: string;
  data: Picking[];
};

export type ReadySalesOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: ReadySalesOrder[];
};
