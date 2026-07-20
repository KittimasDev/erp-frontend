export type GoodsReceiptStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "CANCELLED"
  | string;

export const GOODS_RECEIPT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  CONFIRMED: "ยืนยันแล้ว",
  CANCELLED: "ยกเลิก",
};

export type GoodsReceiptCreditorSummary = {
  id: string;
  creditorCode: string;
  nameTh: string;
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
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
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
  quantity: number;
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
