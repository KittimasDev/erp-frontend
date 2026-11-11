import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";
import { PRODUCTION_ORDER_RUNNING_STATUSES } from "./production-order";
import { stockPostingStatusLabel } from "./stock-posting-request";
import { getStoredLanguage } from "@/lib/i18n/language";

export const ProductionOutputRequestStatus = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;

export type ProductionOutputRequestStatusValue =
  (typeof ProductionOutputRequestStatus)[keyof typeof ProductionOutputRequestStatus];

export const REFERENCE_DOC_TYPE_WEIGHBRIDGE_TICKET = "WEIGHBRIDGE_TICKET";
export const REFERENCE_DOC_TYPE_PRODUCTION_ORDER = "PRODUCTION_ORDER";

export const PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: standardStatusLabel("PENDING_APPROVAL"),
  APPROVED: standardStatusLabel("APPROVED"),
  REJECTED: standardStatusLabel("REJECTED"),
  CANCELLED: standardStatusLabel("CANCELLED"),
};

/** สีป้ายสถานะคำขอนำผลผลิตเข้าสต๊อก — ตามมาตรฐานกลาง */
export const PRODUCTION_OUTPUT_REQUEST_STATUS_COLOR: Record<string, string> = {
  PENDING_APPROVAL: standardStatusColor("PENDING_APPROVAL"),
  APPROVED: standardStatusColor("APPROVED"),
  REJECTED: standardStatusColor("REJECTED"),
  CANCELLED: standardStatusColor("CANCELLED"),
};

/** ป้ายสถานะคำขอตามภาษา ("ยกเลิก" = Cancelled, "ไม่อนุมัติ" = Rejected ไม่ชนกับปุ่ม) — ใช้ตอนเรนเดอร์ */
export function productionOutputStatusLabel(status: string): string {
  if (getStoredLanguage() === "en") {
    return stockPostingStatusLabel(status, "en");
  }
  return PRODUCTION_OUTPUT_REQUEST_STATUS_LABEL[status] ?? status;
}

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
  /**
   * คำขอที่ผูกกับใบสั่งผลิตนี้ — ครอบทั้ง 3 ทางที่ผูกกันได้ ตรงกับที่สูตร Yield ใช้นับ
   *
   * ใช้ตัวนี้แทน `referenceDocId` เมื่อต้องการคำขอของใบสั่งผลิตใบหนึ่ง ·
   * `referenceDocId` ไม่ครอบคอลัมน์ FK `production_order_id` คำขอที่ผูกด้วย FK
   * อย่างเดียวจึงหายไปจากรายการ ทั้งที่ถูกนับใน Yield แล้ว
   */
  productionOrderId?: string;
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

export type ProductionOutputReadyOrderItem = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  plannedQty: string;
  requestedQty: string;
  remainingQty: string;
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
  /** วัตถุดิบที่ตัดเข้าผลิตจริง */
  totalInputQty: string;
  /** ผลผลิตที่รับเข้าคลังแล้ว (คำขอที่อนุมัติ) */
  totalOutputQty: string;
  /** ผลผลิตตามแผนของใบสั่งผลิต */
  totalPlannedOutputQty: string;
  /** yield จริง (%) — นิยามเดียวกับหน้าสรุปใบสั่งผลิต */
  yieldPercent: number;
  /** yield ตามแผน (%) */
  plannedYieldPercent: number;
  /** ผลผลิตตามแผนต่อสินค้า — planned / requested / remaining */
  outputItems?: ProductionOutputReadyOrderItem[];
};

/** ยังขอรับผลผลิตเข้าคลังได้อีก — มี SKU ค้างและยังไม่ถูกบล็อกทั้งตัว */
export function hasRequestableProductionOutput(
  order: ProductionOutputReadyOrder,
): boolean {
  const blocked = new Set(order.blockedItemIds ?? []);
  const items = order.outputItems;
  if (!items) {
    return blocked.size === 0;
  }
  return items.some(
    (item) => Number(item.remainingQty) > 0 && !blocked.has(item.itemId),
  );
}

/**
 * ขอรับผลผลิตจากใบนี้ได้อีกไหม — คนละคำถามกับ [hasRequestableProductionOutput]
 *
 * ตัวบนตอบว่า "ยังมีงานค้างตามแผนไหม" ใช้กับคิวงานและ badge
 * ตัวนี้ตอบว่า "กดขอได้ไหม" — ใบที่ยังเดินเครื่องอยู่ของจริงออกเกินแผนได้เสมอ
 * ครบแผนแล้วจึงไม่ใช่เหตุให้ปิดปุ่ม แค่ไม่เติมยอดให้ ต้องตั้งใจกรอกเอง
 */
export function canRequestMoreProductionOutput(
  order: ProductionOutputReadyOrder,
): boolean {
  return (
    PRODUCTION_ORDER_RUNNING_STATUSES.includes(order.status) ||
    hasRequestableProductionOutput(order)
  );
}

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

export type CreateProductionOutputStockRequestFromOrderItem = {
  itemId: string;
  unitId: string;
  quantity: string;
  lotNo?: string;
};

export type CreateProductionOutputStockRequestFromOrderBody = {
  items: CreateProductionOutputStockRequestFromOrderItem[];
  warehouseId: string;
  warehouseLocationId: string;
  postingDate?: string;
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
