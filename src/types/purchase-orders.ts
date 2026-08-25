export type PurchaseOrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "CONFIRMED"
  | "REJECTED"
  | "PARTIALLY_RECEIVED"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export const PURCHASE_ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  PENDING_APPROVAL: "รออนุมัติ",
  // อนุมัติแล้ว = ส่ง PO ให้ Supplier ได้ และรอของเข้า
  CONFIRMED: "อนุมัติแล้ว · รอส่งสินค้า",
  REJECTED: "ไม่อนุมัติ",
  PARTIALLY_RECEIVED: "รับของบางส่วน",
  COMPLETED: "รับครบแล้ว",
  CANCELLED: "ยกเลิก",
};

export type PurchaseOrderCreditorSummary = {
  id: string;
  creditorCode: string;
  nameTh: string;
};

export type PurchaseOrderPaymentTermSummary = {
  id: string;
  code: string;
  name: string;
};

export type PurchaseOrderTaxRateSummary = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

export type PurchaseOrderPrSummary = {
  id: string;
  prNo: string;
  status: string;
};

export type PurchaseOrderUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type PurchaseOrderItem = {
  id: string;
  purchaseRequestItemId?: string;
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
  expectedWarehouseId?: string;
  expectedWarehouseCode?: string;
  expectedWarehouseName?: string;
  expectedLocationId?: string;
  expectedLocationCode?: string;
  expectedLocationName?: string;
  sortOrder: number;
};

export type PurchaseOrder = {
  id: string;
  poNo: string;
  poDate: string;
  purchaseRequestId?: string;
  purchaseRequest?: PurchaseOrderPrSummary;
  creditorId: string;
  creditor?: PurchaseOrderCreditorSummary;
  paymentTermId?: string;
  paymentTerm?: PurchaseOrderPaymentTermSummary;
  taxRateId?: string;
  taxRate?: PurchaseOrderTaxRateSummary;
  status: PurchaseOrderStatus;
  paymentStatus?: string;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  remark?: string;
  submittedAt?: string;
  approvedById?: string;
  approvedBy?: PurchaseOrderUserSummary;
  approvedAt?: string;
  rejectedReason?: string;
  createdById?: string;
  createdBy?: PurchaseOrderUserSummary;
  items: PurchaseOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderListData = {
  items: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
};

export type PurchaseOrderQueryParams = {
  poNo?: string;
  status?: string;
  purchaseRequestId?: string;
  poDateFrom?: string;
  poDateTo?: string;
  page?: number;
  limit?: number;
};

export type CreatePurchaseOrderItemFromPrBody = {
  purchaseRequestItemId: string;
  unitPrice: number;
  discountAmount?: number;
  description?: string;
};

export type CreatePurchaseOrderFromPrBody = {
  poDate: string;
  creditorId: string;
  paymentTermId?: string;
  taxRateId?: string;
  discountAmount?: number;
  remark?: string;
  items: CreatePurchaseOrderItemFromPrBody[];
};

export type UpdatePurchaseOrderItemBody = {
  id?: string;
  purchaseRequestItemId?: string;
  itemId?: string;
  quantity?: number;
  unitId?: string;
  unitPrice?: number;
  discountAmount?: number;
  description?: string;
  sortOrder?: number;
};

export type UpdatePurchaseOrderBody = {
  poDate?: string;
  creditorId?: string;
  paymentTermId?: string | null;
  taxRateId?: string | null;
  discountAmount?: number;
  remark?: string;
  items?: UpdatePurchaseOrderItemBody[];
};

/** ปฏิเสธ / ส่งกลับแก้ไข ใบสั่งซื้อ */
export type RejectPurchaseOrderBody = {
  reason?: string;
};

export type PurchaseOrderApiResponse = {
  statusCode: number;
  message: string;
  data: PurchaseOrder;
};

export type PurchaseOrderListApiResponse = {
  statusCode: number;
  message: string;
  data: PurchaseOrderListData;
};

export type PurchaseOrderByPrApiResponse = {
  statusCode: number;
  message: string;
  data: PurchaseOrder | null;
};
