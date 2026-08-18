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
  IN_PRODUCTION: "อยู่ในระหว่างการผลิต",
  COMPLETED: "ผลิตครบแล้ว",
  CANCELLED: "ยกเลิก",
};

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
  remark?: string;
  sortOrder: number;
};

export type ProductionRequestProductionOrderRef = {
  id: string;
  orderNo: string;
  status: string;
  productionDate: string;
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
