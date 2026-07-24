export type SalesTrackingSummary = {
  quotationAwaiting: number;
  soAwaitingStockCheck: number;
  soAwaitingPicking: number;
  awaitingPacking: number;
  awaitingDelivery: number;
  delivered: number;
  cancelled: number;
  stockShortIssues: number;
};

export type SalesTrackingRow = {
  salesOrderId: string;
  salesOrderNo: string;
  quotationNo?: string;
  customerName?: string;
  orderDate: string;
  requestedDeliveryDate?: string;
  salesOrderStatus: string;
  pickingNo?: string;
  pickingStatus?: string;
  packingNo?: string;
  packingStatus?: string;
  deliveryOrderNo?: string;
  deliveryStatus?: string;
  currentStep: string;
  nextAction: string;
};

export type SalesTrackingList = {
  items: SalesTrackingRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type SalesTrackingTimelineStep = {
  step: string;
  documentNo?: string;
  documentId?: string;
  status?: string;
  date?: string;
  actorName?: string;
  href?: string;
};

export type SalesTrackingDetail = {
  salesOrderId: string;
  salesOrderNo: string;
  currentStep: string;
  nextAction: string;
  timeline: SalesTrackingTimelineStep[];
};

export type SalesTrackingQueryParams = {
  keyword?: string;
  customerId?: string;
  salesOrderStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};
