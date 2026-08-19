export const ProductionOrderStatus = {
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ProductionOrderStatusValue =
  (typeof ProductionOrderStatus)[keyof typeof ProductionOrderStatus];

export const PRODUCTION_ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ยังไม่เริ่มผลิต",
  IN_PROGRESS: "กำลังผลิต",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export const ProductionOrderPlanLineType = {
  OUTPUT: "OUTPUT",
  WASTE: "WASTE",
} as const;

export const PRODUCTION_ORDER_WASTE_DISPOSAL_STATUS_LABEL: Record<string, string> =
  {
    PENDING_DISPOSAL: "รอทำลาย",
    DISPOSED: "ทำลายแล้ว",
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

export type ProductionOrderPlanLine = {
  id: string;
  lineType: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  plannedQty: string;
  actualQty?: string;
  disposalStatus?: string;
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
  productionRequestId?: string;
  productionRequestNo?: string;
  salesOrderNo?: string;
  batchNo?: string;
  cycleTargetHours: string;
  plannedLaborHours?: string;
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
  planLines: ProductionOrderPlanLine[];
  downtimes: ProductionOrderDowntime[];
  logs: ProductionOrderLog[];
  sourceLines?: ProductionOrderSourceLine[];
  allocationSummary?: ProductionOrderAllocationSummary;
  createdAt: string;
  updatedAt: string;
};

export type ProductionOrderSourceLine = {
  id: string;
  productionRequestId: string;
  productionRequestNo?: string;
  productionRequestItemId: string;
  salesOrderId: string;
  salesOrderNo?: string;
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitId: string;
  unitCode?: string;
  allocatedQty: string;
  fulfilledQty: string;
  remainingQty: string;
  sortOrder: number;
  remark?: string;
  isFulfilled: boolean;
};

export type ProductionOrderAllocationSummary = {
  totalApprovedOutputQty: string;
  totalAllocatedQty: string;
  unallocatedQty: string;
};

export type AllocateProductionOrderOutputLineBody = {
  sourceLineId: string;
  qtyToAllocate: number;
};

export type AllocateProductionOrderOutputBody = {
  lines: AllocateProductionOrderOutputLineBody[];
  reserveSalesOrders?: boolean;
};

export type AllocateProductionOrderOutputResult = {
  sourceLines: ProductionOrderSourceLine[];
  allocationSummary: ProductionOrderAllocationSummary;
  reserveResults: {
    salesOrderId: string;
    salesOrderNo?: string;
    reserved: boolean;
    message?: string;
  }[];
};

export type ProductionOrderOutputBreakdown = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  quantity: string;
};

export type ProductionOrderYieldCompareLine = {
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  unitCode?: string;
  plannedQty: string;
  actualQty: string;
  plannedYieldPercent: number;
  actualYieldPercent: number;
};

export type ProductionOrderSummary = {
  productionOrderId: string;
  totalPlannedInputQty: string;
  totalInputQty: string;
  totalPlannedOutputQty: string;
  totalOutputQty: string;
  totalPlannedWasteQty: string;
  totalActualWasteQty: string;
  plannedLaborHours?: string;
  yieldCompareByItem: ProductionOrderYieldCompareLine[];
  wasteLines: ProductionOrderPlanLine[];
  outputByItem: ProductionOrderOutputBreakdown[];
  yieldPercent: number;
  plannedYieldPercent: number;
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

export type CreateProductionOrderPlanLineBody = {
  lineType: string;
  itemId: string;
  unitId: string;
  plannedQty: number;
  remark?: string;
  sortOrder?: number;
};

export type CreateProductionOrderBody = {
  productionDate: string;
  productionRequestId?: string;
  remark?: string;
  batchNo?: string;
  cycleTargetHours?: number;
  plannedLaborHours?: number;
  planLines: CreateProductionOrderPlanLineBody[];
  inputItems: CreateProductionOrderInputItemBody[];
};

export type BulkCreateProductionOrderSelectionBody = {
  productionRequestId: string;
  productionRequestItemId: string;
  itemId: string;
  unitId: string;
  plannedQty: number;
  sortOrder?: number;
  remark?: string;
};

export type BulkCreateProductionOrdersBody = {
  productionDate: string;
  batchNo?: string;
  remark?: string;
  cycleTargetHours?: number;
  plannedLaborHours?: number;
  sharedPlanLines: CreateProductionOrderPlanLineBody[];
  inputItems: CreateProductionOrderInputItemBody[];
  selections: BulkCreateProductionOrderSelectionBody[];
};

export type CompleteProductionOrderWasteLineBody = {
  planLineId?: string;
  itemId: string;
  unitId: string;
  actualQty: number;
  remark?: string;
};

export type CompleteProductionOrderBody = {
  signature: { typedName: string };
  wasteActualLines?: CompleteProductionOrderWasteLineBody[];
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

export type ProductionOrderBulkCreateApiResponse = {
  statusCode?: number;
  message: string;
  data: {
    items: ProductionOrder[];
  };
};

export type ProductionOrderConsolidatedCreateApiResponse = {
  statusCode?: number;
  message: string;
  data: ProductionOrder;
};

export type AllocateProductionOrderOutputApiResponse = {
  statusCode?: number;
  message: string;
  data: AllocateProductionOrderOutputResult;
};
