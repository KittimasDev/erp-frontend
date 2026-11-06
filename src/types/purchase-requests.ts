export type PurchaseRequestStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "REVISING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export const PURCHASE_REQUEST_STATUS_LABEL: Record<
  PurchaseRequestStatus,
  string
> = {
  DRAFT: "แบบร่างเอกสาร",
  PENDING_APPROVAL: "รออนุมัติ",
  // ถูกผู้อนุมัติส่งกลับมาแก้ — ต้องแยกจาก "ร่าง"
  REVISING: "แก้ไข",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  CANCELLED: "ยกเลิก",
};

/** ป้ายสถานะตามภาษา — ไม่ผ่าน dictionary เพราะ "ยกเลิก"/"แก้ไข" ชนกับปุ่ม Cancel/Edit */
export function purchaseRequestStatusLabel(
  status: string,
  lang: "th" | "en",
): string {
  if (lang === "en") {
    const en: Record<PurchaseRequestStatus, string> = {
      DRAFT: "Draft",
      PENDING_APPROVAL: "Pending approval",
      REVISING: "Revising",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      CANCELLED: "Cancelled",
    };
    return en[status as PurchaseRequestStatus] ?? status;
  }
  return PURCHASE_REQUEST_STATUS_LABEL[status as PurchaseRequestStatus] ?? status;
}

export type PurchaseRequestUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type PurchaseRequestTypeSummary = {
  id: string;
  code: string;
  nameTh: string;
};

export type PurchaseRequestDepartmentSummary = {
  id: string;
  code: string;
  nameTh: string;
};

export type PurchaseRequestItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  requiredDate?: string;
  remark?: string;
  sortOrder: number;
  /**
   * ใบสั่งซื้อที่สั่งบรรทัดนี้ไปแล้ว — ไม่มีค่า = ยังไม่ถูกสั่ง
   * ใบขอซื้อใบเดียวแตกเป็นใบสั่งซื้อได้หลายใบตามเจ้าของสินค้า
   */
  orderedPurchaseOrder?: PurchaseRequestLinkedPo;
};

export type PurchaseRequestLinkedPo = {
  id: string;
  poNo: string;
  status: string;
  paymentStatus?: string;
};

export type PurchaseRequest = {
  id: string;
  prNo: string;
  prDate: string;
  purchaseRequestTypeId: string;
  purchaseRequestType?: PurchaseRequestTypeSummary;
  departmentId?: string;
  department?: PurchaseRequestDepartmentSummary;
  requestedById?: string;
  requestedBy?: PurchaseRequestUserSummary;
  objective?: string;
  status: PurchaseRequestStatus | string;
  remark?: string;
  /** สิ่งที่ผู้อนุมัติสั่งให้แก้ไข ตอนส่งกลับแก้ไข (สถานะ REVISING) */
  rejectedReason?: string;
  items: PurchaseRequestItem[];
  /** ใบล่าสุด — คงไว้เพื่อความเข้ากันได้ย้อนหลัง ตัวเต็มอยู่ใน linkedPurchaseOrders */
  linkedPurchaseOrder?: PurchaseRequestLinkedPo | null;
  /** ใบสั่งซื้อทุกใบที่ผูกกับใบขอซื้อนี้ เรียงใบใหม่สุดก่อน */
  linkedPurchaseOrders?: PurchaseRequestLinkedPo[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseRequestListData = {
  items: PurchaseRequest[];
  total: number;
  page: number;
  limit: number;
};

export type PurchaseRequestQueryParams = {
  prNo?: string;
  status?: string;
  prDateFrom?: string;
  prDateTo?: string;
  itemIds?: string[];
  page?: number;
  limit?: number;
};

export type CreatePurchaseRequestItemBody = {
  itemId: string;
  description?: string;
  quantity: number;
  unitId: string;
  requiredDate?: string;
  remark?: string;
  sortOrder?: number;
};

export type CreatePurchaseRequestBody = {
  prDate: string;
  purchaseRequestTypeId: string;
  departmentId?: string;
  objective?: string;
  remark?: string;
  items: CreatePurchaseRequestItemBody[];
};

export type UpdatePurchaseRequestBody = Partial<CreatePurchaseRequestBody>;

export type RejectPurchaseRequestBody = {
  reason?: string;
};

export type PurchaseRequestApiResponse = {
  statusCode: number;
  message: string;
  data: PurchaseRequest;
};

export type PurchaseRequestListApiResponse = {
  statusCode: number;
  message: string;
  data: PurchaseRequestListData;
};
