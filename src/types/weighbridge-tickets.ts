export type WeighbridgeDashboardSummary = {
  trucksInToday: number;
  waitingWeighIn: number;
  waitingSort: number;
  waitingWeighOut: number;
  waitingApproval: number;
  waitingPayment: number;
  stockPosted: number;
  cancelled: number;
  totalNetWeightKgToday: string;
  totalAmountToday: string;
};

export type WeighbridgeTicketListItem = {
  id: string;
  ticketNo: string;
  ticketType: string;
  status: string;
  sellerId?: string;
  sellerCode?: string;
  sellerName?: string;
  truckId?: string;
  truckLicensePlate?: string;
  truckProvince?: string;
  driverName?: string;
  driverPhone?: string;
  truckType?: string;
  scaleId: string;
  scaleCode?: string;
  scaleName?: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  remark?: string;
  createdAt: string;
  weighOutAt?: string;
  flowState?: string;
  receiptId?: string;
  receiptNo?: string;
  receiptStatus?: string;
  receiptPaymentStatus?: string;
};

export type WeighbridgeDashboardData = {
  summary: WeighbridgeDashboardSummary;
  tickets: WeighbridgeTicketListItem[];
};

export type WeighbridgeDashboardApiResponse = {
  statusCode?: number;
  message: string;
  data: WeighbridgeDashboardData;
};

export type CreateWeighbridgeTicketRequest = {
  sellerId: string;
  truckId: string;
  scaleId: string;
  remark?: string;
};

export type WeighbridgeTicket = {
  id: string;
  ticketNo: string;
  ticketType: string;
  scaleId: string;
  truckId?: string;
  truckLicensePlate?: string;
  driverName?: string;
  sellerId?: string;
  status: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  weightSource: string;
  isManualOverride: boolean;
  remark?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
};

export type WeighbridgeTicketApiResponse = {
  statusCode?: number;
  message: string;
  data: WeighbridgeTicket;
};

export type WeighbridgeTicketDetail = {
  id: string;
  ticketNo: string;
  ticketType: string;
  status: string;
  sellerId?: string;
  sellerCode?: string;
  sellerName?: string;
  truckId?: string;
  truckLicensePlate?: string;
  truckProvince?: string;
  driverName?: string;
  driverPhone?: string;
  truckType?: string;
  scaleId: string;
  scaleCode?: string;
  scaleName?: string;
  weighInAt?: string;
  weighOutAt?: string;
  grossWeightKg: string;
  tareWeightKg: string;
  netWeightKg: string;
  weightSource: string;
  isManualOverride: boolean;
  remark?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  flowState?: string;
  displayStatus: string;
  canWeighIn: boolean;
  canEditWeighIn?: boolean;
  canWeighOut: boolean;
  canEditWeighOut?: boolean;
  receiptId?: string;
  receiptNo?: string;
  receiptStatus?: string;
  receiptPaymentStatus?: string;
  canCreatePurchaseReceipt: boolean;
  weighInReadSource?: string;
  weighInRemark?: string;
  weighOutReadSource?: string;
  weighOutRemark?: string;
};

export type WeighbridgeTicketDetailApiResponse = {
  statusCode?: number;
  message: string;
  data: WeighbridgeTicketDetail;
};

export type WeighTicketRequest = {
  weightKg: number;
  isManual: boolean;
  reason?: string;
  remark?: string;
};

export type ManualOverrideTicketRequest = {
  fieldName: "gross_weight_kg" | "tare_weight_kg";
  newValue: string;
  reason: string;
};

export type WeighbridgeAnalyticsSummary = {
  tickets: number;
  totalNetWeightKg: string;
  totalAmount: string;
  paid: number;
  waitingPayment: number;
};

export type WeighbridgeAnalyticsDailyPoint = {
  date: string;
  tickets: number;
  netWeightKg: string;
  amount: string;
  paid: number;
  waitingPayment: number;
};

export type WeighbridgeAnalyticsHourlyPoint = {
  hour: number;
  tickets: number;
  netWeightKg: string;
  amount: string;
};

export type WeighbridgeAnalyticsByClassification = {
  tireClassificationId: string;
  classificationCode: string;
  classificationName: string;
  tickets: number;
  netWeightKg: string;
  amount: string;
};

export type WeighbridgeAnalyticsData = {
  summary: WeighbridgeAnalyticsSummary;
  daily: WeighbridgeAnalyticsDailyPoint[];
  hourlyDate: string;
  hourly: WeighbridgeAnalyticsHourlyPoint[];
  tireClassificationId?: string;
  byClassification: WeighbridgeAnalyticsByClassification[];
};

export type WeighbridgeAnalyticsApiResponse = {
  statusCode?: number;
  message: string;
  data: WeighbridgeAnalyticsData;
};

export type WeighbridgeAnalyticsQuery = {
  from?: string;
  to?: string;
  date?: string;
  tireClassificationId?: string;
};
