export const ProductionOrderStatus = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ProductionOrderStatusValue =
  (typeof ProductionOrderStatus)[keyof typeof ProductionOrderStatus];

export const PRODUCTION_ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง",
  IN_PROGRESS: "กำลังผลิต",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export type ProductionOrderUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type ProductionOrderInputItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  warehouseId: string;
  warehouseCode?: string;
  locationId: string;
  locationCode?: string;
  lotId?: string;
  lotNo?: string;
  unitId: string;
  unitCode?: string;
  plannedQty: string;
  actualQty: string;
  remark?: string;
  sortOrder: number;
};

export type ProductionOrderDowntime = {
  id: string;
  startAt: string;
  endAt?: string;
  reason: string;
  recordedById?: string;
  recordedByName?: string;
};

export type ProductionOrderLog = {
  id: string;
  loggedAt: string;
  note: string;
  recordedById?: string;
  recordedByName?: string;
};

export type ProductionOrder = {
  id: string;
  orderNo: string;
  batchNo?: string;
  cycleTargetHours: string;
  productionDate: string;
  status: string;
  remark?: string;
  requestedById?: string;
  requestedBy?: ProductionOrderUserSummary;
  startedById?: string;
  startedBy?: ProductionOrderUserSummary;
  startedAt?: string;
  completedById?: string;
  completedBy?: ProductionOrderUserSummary;
  completedAt?: string;
  inputItems: ProductionOrderInputItem[];
  downtimes: ProductionOrderDowntime[];
  logs: ProductionOrderLog[];
  createdAt: string;
  updatedAt: string;
};

export type ProductionOrderOutputBreakdown = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  quantity: string;
};

export type ProductionOrderSummary = {
  productionOrderId: string;
  totalInputQty: string;
  totalOutputQty: string;
  outputByItem: ProductionOrderOutputBreakdown[];
  yieldPercent: number;
  massBalanceDiff: string;
  actualCycleHours?: number;
  cycleTargetHours: string;
  totalDowntimeHours: number;
};

export type CreateProductionOrderInputItemBody = {
  itemId: string;
  warehouseId: string;
  locationId: string;
  lotId: string;
  unitId: string;
  plannedQty: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateProductionOrderBody = {
  productionDate: string;
  remark?: string;
  batchNo?: string;
  cycleTargetHours?: number;
  inputItems: CreateProductionOrderInputItemBody[];
};

export type CompleteProductionOrderBody = {
  signature: { typedName: string };
};

export type RecordDowntimeBody = {
  startAt: string;
  reason: string;
};

export type EndDowntimeBody = {
  endAt?: string;
};

export type CreateProductionOrderLogBody = {
  note: string;
  loggedAt?: string;
};

export type QueryProductionOrdersParams = {
  orderNo?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ProductionOrderListData = {
  items: ProductionOrder[];
  total: number;
  page: number;
  limit: number;
};

export type ProductionOrderApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrder;
};

export type ProductionOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrderListData;
};

export type ProductionOrderSummaryApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrderSummary;
};
