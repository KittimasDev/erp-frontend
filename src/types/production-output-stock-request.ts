export const ProductionOutputRequestStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export type ProductionOutputRequestStatusValue =
  (typeof ProductionOutputRequestStatus)[keyof typeof ProductionOutputRequestStatus];

export const REFERENCE_DOC_TYPE_WEIGHBRIDGE_TICKET = "WEIGHBRIDGE_TICKET";

export const PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
};

export type ProductionOutputStockRequestReference = {
  id: string;
  referenceDocType: string;
  referenceDocId: string;
  referenceDocNo?: string;
};

export type LinkedMaterialIssueItem = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  lotNo?: string;
  quantity: string;
  unitCode?: string;
  warehouseCode?: string;
  warehouseName?: string;
};

export type LinkedMaterialIssue = {
  id: string;
  issueNo: string;
  status: string;
  issueDate: string;
  productionOrderId?: string;
  items: LinkedMaterialIssueItem[];
};

export type ProductionOutputStockRequest = {
  id: string;
  requestNo: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  unitNameTh?: string;
  quantity: string;
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  warehouseLocationId: string;
  locationCode?: string;
  locationName?: string;
  postingDate: string;
  productionOrderId?: string;
  productionOrderNo?: string;
  referenceDocType?: string;
  referenceDocId?: string;
  referenceDocNo?: string;
  references?: ProductionOutputStockRequestReference[];
  linkedMaterialIssues?: LinkedMaterialIssue[];
  lotNo?: string;
  status: string;
  remark?: string;
  requestedById: string;
  requestedByName?: string;
  requestedAt: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectedById?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductionOutputReferenceInput = {
  referenceDocType: string;
  referenceDocId: string;
  referenceDocNo?: string;
};

export type CreateProductionOutputStockRequestBody = {
  itemId: string;
  unitId: string;
  quantity: string;
  warehouseId: string;
  warehouseLocationId: string;
  postingDate: string;
  referenceDocType?: string;
  referenceDocId?: string;
  referenceDocNo?: string;
  references?: ProductionOutputReferenceInput[];
  lotNo?: string;
  remark?: string;
  materialIssueIds?: string[];
};

export type CreateProductionOutputStockRequestBatchBody = {
  items: CreateProductionOutputStockRequestBody[];
  references?: ProductionOutputReferenceInput[];
};

export type RejectProductionOutputStockRequestBody = {
  rejectReason: string;
};

export type ProductionOutputStockRequestQueryParams = {
  status?: string;
  itemId?: string;
  warehouseId?: string;
  referenceDocType?: string;
  referenceDocId?: string;
  q?: string;
};

export type ProductionOutputStockRequestApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOutputStockRequest;
};

export type ProductionOutputStockRequestListApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOutputStockRequest[];
};

export type QueryProductionOutputReadyOrdersParams = {
  from?: string;
  to?: string;
  all?: boolean;
  q?: string;
};

export type ProductionOutputReadyOrder = {
  id: string;
  orderNo: string;
  batchNo?: string;
  productionDate: string;
  status: string;
  completedAt?: string;
  totalRequestCount: number;
  blockedItemIds: string[];
};

export type ProductionOutputReadyOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOutputReadyOrder[];
};

export type AvailableMaterialIssueListApiResponse = {
  statusCode?: number;
  message: string;
  data: LinkedMaterialIssue[];
};

export type CreateProductionOutputStockRequestFromOrderBody = {
  itemId: string;
  unitId: string;
  quantity: string;
  warehouseId: string;
  warehouseLocationId: string;
  postingDate?: string;
  lotNo?: string;
  remark?: string;
  materialIssueIds?: string[];
};

/** ล็อก Step 5 / ฟอร์มสร้าง เมื่อมีคำขอรออนุมัติหรืออนุมัติแล้วของตั๋วนี้ */
export function resolveProductionOutputTicketLock(
  requests: ProductionOutputStockRequest[],
) {
  const pending = requests.filter(
    (row) => row.status === ProductionOutputRequestStatus.PENDING_APPROVAL,
  );
  const approved = requests.filter(
    (row) => row.status === ProductionOutputRequestStatus.APPROVED,
  );
  const rejected = requests.filter(
    (row) => row.status === ProductionOutputRequestStatus.REJECTED,
  );

  if (pending.length > 0) {
    return {
      locked: true as const,
      reason: "pending" as const,
      label: "รออนุมัติ",
      message:
        "ส่งคำขอแล้วและรอหัวหน้าคลังอนุมัติ — ไม่สามารถแก้ไขหรือส่งซ้ำได้",
      requests,
    };
  }

  if (approved.length > 0) {
    return {
      locked: true as const,
      reason: "approved" as const,
      label: "อนุมัติแล้ว",
      message:
        "คำขอรับผลผลิตของตั๋วนี้ถูกอนุมัติแล้ว — ไม่สามารถส่งซ้ำได้",
      requests,
    };
  }

  if (rejected.length > 0) {
    return {
      locked: false as const,
      reason: "rejected" as const,
      label: "ถูกปฏิเสธ — ส่งใหม่ได้",
      message:
        "คำขอก่อนหน้าถูกปฏิเสธ สามารถแก้ไขรายการแล้วส่งคำขอใหม่ได้",
      requests,
    };
  }

  return {
    locked: false as const,
    reason: "none" as const,
    label: "พร้อมสร้างคำขอ",
    message: null as string | null,
    requests,
  };
}
