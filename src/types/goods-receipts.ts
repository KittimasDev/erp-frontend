export type GoodsReceiptStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "CANCELLED"
  | string;

export const GOODS_RECEIPT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export type GoodsReceiptCreditorSummary = {
  id: string;
  creditorCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactPhone?: string;
};

export type GoodsReceiptPoSummary = {
  id: string;
  poNo: string;
  status: string;
  paymentStatus?: string;
};

export type GoodsReceiptUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type GoodsReceiptWarehouseSummary = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
};

export type GoodsReceiptLocationSummary = {
  id: string;
  locationCode: string;
  locationName: string;
};

export type GoodsReceiptItem = {
  id: string;
  purchaseOrderItemId?: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
  /** หน่วยฐานของสินค้าเสมอ (เท่ากับ baseQuantity) — ใช้ตัดสต๊อกจริง */
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  /** จำนวน+หน่วยที่ผู้ใช้กรอกจริง — ยังไม่มีในเอกสารที่สร้างก่อนเปิดใช้การแปลงหน่วย */
  enteredQuantity?: string;
  enteredUnitId?: string;
  enteredUnitCode?: string;
  enteredUnitNameTh?: string;
  baseQuantity?: string;
  baseUnitId?: string;
  baseUnitCode?: string;
  baseUnitNameTh?: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  warehouseId: string;
  warehouse?: GoodsReceiptWarehouseSummary;
  locationId: string;
  location?: GoodsReceiptLocationSummary;
  lotNo?: string;
  batchNo?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  qcStatus?: string;
  sortOrder: number;
};

export type GoodsReceipt = {
  id: string;
  grNo: string;
  grDate: string;
  purchaseOrderId: string;
  purchaseOrder?: GoodsReceiptPoSummary;
  creditorId: string;
  creditor?: GoodsReceiptCreditorSummary;
  receivedById?: string;
  receivedBy?: GoodsReceiptUserSummary;
  status: GoodsReceiptStatus;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  remark?: string;
  postedAt?: string;
  grType?: string;
  sourceDocumentType?: string;
  sourceDocumentId?: string;
  qcStatus?: string;
  items: GoodsReceiptItem[];
  createdAt: string;
  updatedAt: string;
};

export type GoodsReceiptListData = {
  items: GoodsReceipt[];
  total: number;
  page: number;
  limit: number;
};

export type GoodsReceiptQueryParams = {
  grNo?: string;
  status?: string;
  purchaseOrderId?: string;
  grDateFrom?: string;
  grDateTo?: string;
  page?: number;
  limit?: number;
};

export type CreateGoodsReceiptItemFromPoBody = {
  purchaseOrderItemId: string;
  /** จำนวนในหน่วยที่ระบุใน unitId */
  quantity: number;
  /** ไม่ส่ง = ใช้หน่วยของรายการในใบสั่งซื้อ */
  unitId?: string;
  warehouseId: string;
  locationId: string;
  lotNo?: string;
  batchNo?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  description?: string;
};

export type CreateGoodsReceiptFromPoBody = {
  grDate: string;
  remark?: string;
  items: CreateGoodsReceiptItemFromPoBody[];
};

export type UpdateGoodsReceiptItemBody = {
  id?: string;
  purchaseOrderItemId?: string;
  quantity?: number;
  unitId?: string;
  warehouseId?: string;
  locationId?: string;
  lotNo?: string;
  batchNo?: string;
  manufacturingDate?: string | null;
  expiryDate?: string | null;
  description?: string;
  sortOrder?: number;
};

export type UpdateGoodsReceiptBody = {
  grDate?: string;
  remark?: string;
  items?: UpdateGoodsReceiptItemBody[];
};

export type GoodsReceiptApiResponse = {
  statusCode: number;
  message: string;
  data: GoodsReceipt;
};

export type GoodsReceiptListApiResponse = {
  statusCode: number;
  message: string;
  data: GoodsReceiptListData;
};

export type GoodsReceiptByPoApiResponse = {
  statusCode: number;
  message: string;
  data: GoodsReceipt[];
};
