export type PurchaseOrderStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "REVISING"
  | "CONFIRMED"
  | "REJECTED"
  | "PARTIALLY_RECEIVED"
  | "COMPLETED"
  | "CLOSED_PARTIAL"
  | "RECEIVE_CANCELLED"
  | "CANCELLED"
  | string;

export const PURCHASE_ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "แบบร่างเอกสาร",
  PENDING_APPROVAL: "รออนุมัติ",
  // ถูกหัวหน้าส่งกลับมาแก้ — ต้องแยกจาก "ร่าง" ให้เห็นว่ามีงานค้างอยู่
  REVISING: "แก้ไข",
  // อนุมัติแล้ว = ส่ง PO ให้ Supplier ได้ และรอของเข้า
  CONFIRMED: "อนุมัติแล้ว · รอส่งสินค้า",
  REJECTED: "ไม่อนุมัติ",
  PARTIALLY_RECEIVED: "รับของบางส่วน",
  COMPLETED: "รับครบแล้ว",
  CLOSED_PARTIAL: "ปิดรับบางส่วน",
  RECEIVE_CANCELLED: "ยกเลิกการรับ",
  CANCELLED: "ยกเลิก",
};

/** ใบที่อนุมัติแล้วแต่ยังไม่มีของเข้า (รวมกรณีมีรอบยกเลิกการรับปน) — ใบเก่าที่ไม่มี receiveStatus คงป้ายเดิม */
export function purchaseOrderStatusLabel(
  po: Pick<PurchaseOrder, "status" | "receiveStatus">,
) {
  if (po.status === "CONFIRMED" && po.receiveStatus === "NOT_RECEIVED") {
    return "ยังไม่ได้รับสินค้า";
  }
  return PURCHASE_ORDER_STATUS_LABEL[po.status] ?? po.status;
}

/** รับของได้เฉพาะใบที่ยังเปิดรับ และยังมี Qty คงเหลือในรอบที่เปิด */
export function isPoReceivableStatus(status: string) {
  return status === "CONFIRMED" || status === "PARTIALLY_RECEIVED";
}

/** จ่ายเงินได้เมื่อรับครบ หรือปิดรับบางส่วน — ไม่รวมยกเลิกการรับ */
export function isPoPayableStatus(status: string) {
  return status === "COMPLETED" || status === "CLOSED_PARTIAL";
}

export type PurchaseOrderCreditorSummary = {
  id: string;
  creditorCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
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
  phone?: string;
  departmentName?: string;
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

export const PO_CHARGE_TYPE_LABEL: Record<string, string> = {
  FREIGHT: "ค่าขนส่ง",
  SERVICE: "ค่าบริการ",
  OTHER: "ค่าใช้จ่ายอื่น ๆ",
};

/** ค่าใช้จ่ายเพิ่มเติมของ PO (แยกจากรายการสินค้า) + ยอดที่ตั้งหนี้แล้ว/คงเหลือ */
export type PurchaseOrderCharge = {
  id: string;
  chargeType: string;
  description: string;
  amountBeforeVat: string;
  /** NONE / EXCLUSIVE / INCLUSIVE */
  vatMode: string;
  taxRateId?: string | null;
  taxRatePercent: string;
  vatAmount: string;
  totalAmount: string;
  whtApplicable: boolean;
  whtIncomeType?: string | null;
  whtRate: string;
  sortOrder: number;
  /** ยอดก่อน VAT ที่นำไปตั้งหนี้แล้ว (AP ที่ยังมีผล) */
  allocatedAmount: number;
  /** ยอดก่อน VAT ที่ยังนำไปตั้งหนี้ได้ */
  remainingAmount: number;
};

export type PurchaseOrderChargeBody = {
  id?: string;
  chargeType: string;
  description: string;
  amountBeforeVat: number;
  vatMode?: string;
  taxRateId?: string | null;
  whtApplicable?: boolean;
  whtIncomeType?: string | null;
  whtRate?: number;
};

export type PoPaymentAdjustmentItem = {
  id: string;
  docNo: string;
  docType: "DEBIT_NOTE" | "CREDIT_NOTE";
  docDate: string;
  totalAmount: number;
  signedAmount: number;
  appliedAt: string;
  apDocumentId: string;
  apDocumentNo: string;
};

/** สรุปยอดชำระหลังรวมใบปรับหนี้ — ไม่แก้ totalAmount ของ PO */
export type PoPaymentAdjustment = {
  originalAmount: number;
  appliedDebits: number;
  appliedCredits: number;
  payableAmount: number;
  paidAmount: number;
  remainingAmount: number;
  adjustments: PoPaymentAdjustmentItem[];
};

export type PurchaseOrder = {
  id: string;
  poNo: string;
  poDate: string;
  purchaseRequestId?: string;
  /** ใบขอซื้อใบแรก — ใบที่รวมมาหลายใบให้ใช้ `purchaseRequests` */
  purchaseRequest?: PurchaseOrderPrSummary;
  /** ใบขอซื้อต้นทางทั้งหมด (backend อ่านจากบรรทัด) */
  purchaseRequests?: PurchaseOrderPrSummary[];
  creditorId: string;
  creditor?: PurchaseOrderCreditorSummary;
  paymentTermId?: string;
  paymentTerm?: PurchaseOrderPaymentTermSummary;
  taxRateId?: string;
  taxRate?: PurchaseOrderTaxRateSummary;
  vatMode?: string;
  expectedDeliveryDate?: string;
  paymentMethod?: string;
  withholdingTaxType?: string;
  withholdingTaxPercent?: string;
  status: PurchaseOrderStatus;
  receiveStatus?: string;
  paymentStatus?: string;
  /** ยอดจ่ายจริงสะสมจาก supplier_payments (หน้า detail) */
  paidAmount?: string;
  /** สรุปการชำระเงินและการปรับหนี้ (หน้า detail — ไม่แก้ยอด PO ต้นฉบับ) */
  paymentAdjustment?: PoPaymentAdjustment;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  /** ยอดรวม PO = ค่าสินค้า + ค่าใช้จ่ายเพิ่มเติม + VAT ทั้งหมด */
  totalAmount: string;
  /** ค่าใช้จ่ายเพิ่มเติมรวม (ก่อน VAT) — รวมใน totalAmount แล้ว */
  extraChargesAmount?: string;
  /** VAT ของค่าใช้จ่ายเพิ่มเติม — รวมใน vatAmount แล้ว */
  extraChargesVat?: string;
  charges?: PurchaseOrderCharge[];
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
  itemIds?: string[];
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
  vatMode?: string;
  expectedDeliveryDate?: string;
  paymentMethod?: string;
  withholdingTaxType?: string;
  withholdingTaxPercent?: number;
  discountAmount?: number;
  remark?: string;
  items: CreatePurchaseOrderItemFromPrBody[];
  charges?: PurchaseOrderChargeBody[];
};

/** รวมใบขอซื้อหลายใบเป็นใบสั่งซื้อใบเดียว — โครงเดิม เพิ่มรายการใบขอซื้อต้นทาง */
export type CreatePurchaseOrderFromPrsBody = CreatePurchaseOrderFromPrBody & {
  purchaseRequestIds: string[];
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
  vatMode?: string;
  expectedDeliveryDate?: string | null;
  paymentMethod?: string | null;
  withholdingTaxType?: string;
  withholdingTaxPercent?: number;
  discountAmount?: number;
  remark?: string;
  items?: UpdatePurchaseOrderItemBody[];
  /** ไม่ส่ง = ไม่แตะค่าเดิม · [] = ลบทั้งหมด · รายการ = upsert ตาม id */
  charges?: PurchaseOrderChargeBody[];
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

/**
 * ใบขอซื้อต้นทางของใบสั่งซื้อ
 *
 * ใบที่สร้างก่อนมีฟีเจอร์รวมหลายใบ (และ response เก่าที่ยัง cache อยู่) จะมีแค่
 * `purchaseRequest` เดี่ยว จึง fallback ให้ด้วย ผู้เรียกทุกที่จะได้เห็นรูปเดียวกัน
 */
export function listPurchaseRequests(
  po: Pick<PurchaseOrder, "purchaseRequest" | "purchaseRequests">,
): PurchaseOrderPrSummary[] {
  if (po.purchaseRequests?.length) {
    return po.purchaseRequests;
  }
  return po.purchaseRequest ? [po.purchaseRequest] : [];
}
