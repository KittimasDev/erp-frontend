import { standardStatusColor, standardStatusLabel } from "@/lib/status/standard-status";
import { getStoredLanguage } from "@/lib/i18n/language";

/** ป้ายสถานะ (ใบขอผลิต/ใบสั่งผลิต) ตามภาษา — ไทยคืนข้อความเดิม · "ยกเลิก" ที่นี่คือสถานะ Cancelled ไม่ใช่ปุ่ม Cancel */
const PRODUCTION_STATUS_EN: Record<string, string> = {
  "รอเปิดใบสั่งผลิต": "Pending production order",
  "อยู่ในระหว่างการผลิต": "In production",
  "ผลิตครบแล้ว": "Fully produced",
  "มีใบสั่งผลิตที่ยังไม่เสร็จ": "Has unfinished production orders",
  "ยังไม่เริ่มผลิต": "Not started",
  "กำลังผลิต": "In progress",
  "กำลังดำเนินการ": "In progress",
  "หยุดชั่วคราว": "Paused",
  "เสร็จสิ้น": "Completed",
  "ยกเลิก": "Cancelled",
};

export function tProductionStatus(thai: string): string {
  if (getStoredLanguage() !== "en") return thai;
  return PRODUCTION_STATUS_EN[thai] ?? thai;
}

export const ProductionRequestStatus = {
  PENDING: "PENDING",
  IN_PRODUCTION: "IN_PRODUCTION",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ProductionRequestStatusValue =
  (typeof ProductionRequestStatus)[keyof typeof ProductionRequestStatus];

export const PRODUCTION_REQUEST_STATUS_LABEL: Record<string, string> = {
  PENDING: "รอเปิดใบสั่งผลิต",
  IN_PRODUCTION: standardStatusLabel("IN_PROGRESS"),
  COMPLETED: "ผลิตครบแล้ว",
  CANCELLED: standardStatusLabel("CANCELLED"),
};

export const PRODUCTION_REQUEST_STATUS_FILTER_LABEL: Record<string, string> = {
  PENDING: "รอเปิดใบสั่งผลิต",
  IN_PRODUCTION: "มีใบสั่งผลิตที่ยังไม่เสร็จ",
  COMPLETED: "ผลิตครบแล้ว",
  CANCELLED: "ยกเลิก",
};

const PRODUCTION_REQUEST_STATUS_TAG_COLOR: Record<string, string> = {
  PENDING: "default",
  IN_PRODUCTION: standardStatusColor("IN_PROGRESS"),
  COMPLETED: standardStatusColor("COMPLETED"),
  CANCELLED: standardStatusColor("CANCELLED"),
};

export function getProductionRequestStatusDisplay(
  status: string,
  productionOrders?: { status: string }[],
): { label: string; color: string } {
  if (status === ProductionRequestStatus.IN_PRODUCTION) {
    const orders = productionOrders ?? [];
    const hasInProgress = orders.some((order) => order.status === "IN_PROGRESS");
    const hasDraft = orders.some((order) => order.status === "DRAFT");
    if (hasInProgress) {
      return { label: standardStatusLabel("IN_PROGRESS"), color: standardStatusColor("IN_PROGRESS") };
    }
    if (hasDraft || orders.length === 0) {
      return { label: "ยังไม่เริ่มผลิต", color: "default" };
    }
  }

  return {
    label: PRODUCTION_REQUEST_STATUS_LABEL[status] ?? status,
    color: PRODUCTION_REQUEST_STATUS_TAG_COLOR[status] ?? "default",
  };
}

export type ProductionRequestUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type ProductionRequestItem = {
  id: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  requestedQty: string;
  producedQty: string;
  outstandingQty: string;
  hasUnitMismatch: boolean;
  salesOrderQty: string;
  deliveredQty: string;
  alreadyRequestedQty: string;
  remainingQty: string;
  warehouseAvailableQty: string;
  remark?: string;
  sortOrder: number;
};

export type ProductionRequestProductionOrderRef = {
  id: string;
  orderNo: string;
  status: string;
  productionDate: string;
};

export type ProductionRequestPlanningTag = {
  productionRequestId: string;
  requestNo: string;
  salesOrderId: string;
  soNo?: string;
  customerName?: string;
  requiredDate?: string;
  productionRequestStatus: string;
  outstandingQty: string;
  productionRequestItemId?: string;
  createdAt?: string;
  isCompleted: boolean;
  hasActiveProductionOrder: boolean;
};

export type ProductionRequestPlanningSummaryItem = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  totalOutstandingQty: string;
  totalRequestedQty: string;
  totalProducedQty: string;
  requestCount: number;
  tags: ProductionRequestPlanningTag[];
};

export type ProductionRequestPlanningSummary = {
  itemCount: number;
  requestCount: number;
  customerCount: number;
  items: ProductionRequestPlanningSummaryItem[];
};

export type ProductionRequest = {
  id: string;
  requestNo: string;
  requestDate: string;
  requiredDate?: string;
  salesOrderId: string;
  soNo?: string;
  salesOrderStatus?: string;
  customerName?: string;
  status: string;
  totalRequestedQty: string;
  totalProducedQty: string;
  producedPercent: number;
  sourceSoCancelled: boolean;
  sourceSoCancelledAt?: string;
  remark?: string;
  cancelReason?: string;
  requestedById?: string;
  requestedBy?: ProductionRequestUserSummary;
  cancelledById?: string;
  cancelledBy?: ProductionRequestUserSummary;
  cancelledAt?: string;
  items: ProductionRequestItem[];
  productionOrders: ProductionRequestProductionOrderRef[];
  createdAt: string;
  updatedAt: string;
};

export type EligibleSalesOrderItem = {
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  salesOrderQty: string;
  deliveredQty: string;
  reservedQty?: string;
  availableQty?: string;
  alreadyRequestedQty: string;
  remainingQty: string;
  /** คงค้างขอได้ − ของที่มีในคลังแล้ว — ค่าตั้งต้นเมื่อไม่ได้ deep-link รอบ */
  suggestedProductionQty?: string;
  sortOrder: number;
};

export type EligibleSalesOrder = {
  salesOrderId: string;
  soNo: string;
  soDate: string;
  status: string;
  customerName?: string;
  requestedDeliveryDate?: string;
  items: EligibleSalesOrderItem[];
};

export type CreateProductionRequestItemBody = {
  salesOrderItemId: string;
  /**
   * บรรทัดรอบจัดส่งที่ขอผลิตให้ — ไม่ส่งก็ได้ (ผลิตเผื่อ)
   *
   * ถ้าส่งมา ของที่ผลิตเสร็จจะถูกกันไว้ให้รอบนั้นตรง ๆ · ถ้าไม่ส่ง ระบบจะเลือก
   * รอบที่ต้องส่งเร็วสุดที่ยังขาดของให้เองตอนของเข้าคลัง
   */
  deliveryScheduleItemId?: string;
  requestedQty: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateProductionRequestBody = {
  salesOrderId: string;
  requestDate: string;
  requiredDate?: string;
  remark?: string;
  items: CreateProductionRequestItemBody[];
};

export type UpdateProductionRequestBody = {
  requestDate: string;
  requiredDate?: string;
  remark?: string;
  items: CreateProductionRequestItemBody[];
};

export type CancelProductionRequestBody = {
  cancelReason?: string;
};

export type QueryProductionRequestsParams = {
  requestNo?: string;
  soNo?: string;
  status?: string;
  salesOrderId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ProductionRequestListData = {
  items: ProductionRequest[];
  total: number;
  page: number;
  limit: number;
};

export type ProductionRequestApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionRequest;
};

export type ProductionRequestListApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionRequestListData;
};

export type ProductionRequestPlanningSummaryApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionRequestPlanningSummary;
};

export type EligibleSalesOrderApiResponse = {
  statusCode?: number;
  message: string;
  data: EligibleSalesOrder;
};

export type EligibleSalesOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: EligibleSalesOrder[];
};

export type QueryLinkedSalesOrdersParams = {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export type LinkedSalesOrderProductionRequest = {
  id: string;
  requestNo: string;
  status: string;
  producedPercent: number;
  requiredDate?: string;
};

export type LinkedSalesOrderLine = {
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitCode?: string;
  orderedQty: string;
  reservedQty: string;
  needQty: string;
  warehouseAvailableQty: string;
  /** มีใบขอผลิตคุมไว้แล้วแต่ยังผลิตไม่เสร็จ — ผูกกับ SO นี้แล้ว ใบอื่นเอาไปไม่ได้ */
  pendingProductionQty: string;
  /** ยังต้องหาของเพิ่มจริง ๆ = สั่ง − จองแล้ว − รอผลิต */
  shortageQty: string;
  isFullyReserved: boolean;
  warehouseCoversNeed: boolean;
  /** จองแล้ว + รอผลิต ครอบคลุมยอดสั่งครบ */
  isCoveredByPlan: boolean;
};

export type LinkedSalesOrder = {
  salesOrderId: string;
  soNo: string;
  soStatus: string;
  customerName?: string;
  requestedDeliveryDate?: string;
  requestCount: number;
  latestRequestStatus: string;
  hasShortage: boolean;
  isFullyReserved: boolean;
  /** ยังขาดของจริง ๆ หลังหักที่จองแล้วและที่สั่งผลิตไว้ — ต้องเปิดใบขอผลิตเพิ่ม */
  hasUnplannedShortage: boolean;
  productionRequests: LinkedSalesOrderProductionRequest[];
  lines: LinkedSalesOrderLine[];
};

export type LinkedSalesOrderListData = {
  items: LinkedSalesOrder[];
  total: number;
  page: number;
  limit: number;
};

export type LinkedSalesOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: LinkedSalesOrderListData;
};
