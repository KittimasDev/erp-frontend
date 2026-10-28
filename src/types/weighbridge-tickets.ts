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
  currentStep?: string;
  nextAction?: string;
  nextActionHref?: string;
  receiptId?: string;
  receiptNo?: string;
  receiptStatus?: string;
  receiptPaymentStatus?: string;
  receiptStockPostingStatus?: string;
  hasPendingStockPosting?: boolean;
  hasClassificationPlan?: boolean;
  /** ที่มาของตั๋ว: MANUAL = เปิดเอง · T2900 = จากเครื่องชั่ง · OCR = จากรูปใบชั่ง */
  origin?: WeighbridgeTicketOrigin;
  /** เลขเอกสารต้นทาง เช่น เลขบัตรชั่ง T2900 */
  referenceDocNo?: string;
};

export type WeighbridgeTicketOrigin = "MANUAL" | "T2900" | "OCR";

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
  currentStep?: string;
  nextAction?: string;
  nextActionHref?: string;
  displayStatus: string;
  canWeighIn: boolean;
  canEditWeighIn?: boolean;
  canWeighOut: boolean;
  canEditWeighOut?: boolean;
  canSaveClassificationPlan?: boolean;
  canCompleteWeighAndReceipt?: boolean;
  hasClassificationPlan?: boolean;
  origin?: WeighbridgeTicketOrigin;
  referenceDocNo?: string;
  classificationPlan?: ClassificationPlan;
  receiptId?: string;
  receiptNo?: string;
  receiptStatus?: string;
  receiptPaymentStatus?: string;
  receiptStockPostingStatus?: string;
  hasPendingStockPosting?: boolean;
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

export type ClassificationPlanItem = {
  tireClassificationId: string;
  description?: string;
  pricePerKg?: number;
  weightKg?: number;
};

export type ClassificationPlanDeduction = {
  deductionType: string;
  description?: string;
  deductionWeightKg?: number;
  deductionPricePerKg?: number;
  deductionAmount?: number;
};

export type ClassificationPlan = {
  items: ClassificationPlanItem[];
  deductions?: ClassificationPlanDeduction[];
  remark?: string;
  /** 1-based line number; omit = each row uses its own price */
  priceSourceLineNo?: number;
};

export type SaveClassificationPlanRequest = ClassificationPlan;

export type CompleteWeighAndReceiptRequest = {
  grossWeightKg: number;
  tareWeightKg: number;
  isManual: boolean;
  reason?: string;
  weighInRemark?: string;
  weighOutRemark?: string;
  items: Array<{
    tireClassificationId: string;
    weightKg: number;
    description?: string;
    pricePerKg?: number;
  }>;
  deductions?: Array<{
    deductionType: string;
    deductionWeightKg: number;
    deductionPricePerKg?: number;
    deductionAmount?: number;
    description?: string;
  }>;
  remark?: string;
  priceSourceLineNo?: number;
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
  /** ยังไม่เปิดใบรับซื้อ (ยังไม่มีสถานะจ่ายเงิน) */
  unreceipted: number;
  /** บัตร T2900 ที่ยังไม่เปิดตั๋วใน ERP (นับรวมในจำนวนตั๋วแล้ว) */
  t2900Only: number;
};

export type WeighbridgeAnalyticsDailyPoint = {
  date: string;
  tickets: number;
  netWeightKg: string;
  amount: string;
  paid: number;
  waitingPayment: number;
  unreceipted: number;
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
  /** ALL = ตั๋วรับซื้อ + บัตร T2900 ที่ยังไม่เปิดตั๋ว (ค่าเริ่มต้น) */
  source?: WeighbridgeAnalyticsSource;
};

export type WeighbridgeAnalyticsSource = "ALL" | "PURCHASE" | "T2900";
