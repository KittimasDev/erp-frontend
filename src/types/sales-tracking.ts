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

/** ความคืบหน้าของหนึ่งรอบจัดส่ง — เอกสารจ่าย/บรรจุ/ส่ง ผูกกับรอบ ไม่ใช่กับ SO */
export type SalesTrackingRound = {
  deliveryScheduleId: string;
  roundNo: number;
  deliveryDate: string;
  roundStatus: string;
  pickingNo?: string;
  pickingStatus?: string;
  packingNo?: string;
  packingStatus?: string;
  deliveryOrderNo?: string;
  deliveryOrderStatus?: string;
  currentStep: string;
  nextAction: string;
};

export type SalesTrackingItem = {
  id: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
};

export type SalesTrackingRow = {
  salesOrderId: string;
  salesOrderNo: string;
  quotationNo?: string;
  customerName?: string;
  orderDate: string;
  requestedDeliveryDate?: string;
  salesOrderStatus: string;
  /** ความคืบหน้าระดับ SO สรุปจากทุกรอบ — คนละตัวกับ deliveryStatus ของใบส่งของ */
  salesOrderDeliveryStatus?: string;

  /**
   * คอลัมน์เอกสารระดับ SO — **backend ส่งมาเฉพาะใบที่มีรอบเดียว**
   * ใบที่แบ่งหลายรอบจะเป็น undefined ทั้งชุด ให้อ่านจาก rounds[] แทน
   * (เจตนา — ดีกว่าโชว์ของรอบใดรอบหนึ่งแล้วให้คนเข้าใจว่าเป็นของทั้งใบ)
   */
  pickingNo?: string;
  pickingStatus?: string;
  packingNo?: string;
  packingStatus?: string;
  deliveryOrderNo?: string;
  deliveryStatus?: string;

  roundCount: number;
  rounds: SalesTrackingRound[];
  currentStep: string;
  nextAction: string;
  items: SalesTrackingItem[];
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

export type SalesTrackingRoundTimeline = {
  deliveryScheduleId: string;
  roundNo: number;
  deliveryDate: string;
  roundStatus: string;
  currentStep: string;
  nextAction: string;
  timeline: SalesTrackingTimelineStep[];
};

export type SalesTrackingDetail = {
  salesOrderId: string;
  salesOrderNo: string;
  currentStep: string;
  nextAction: string;
  salesOrderDeliveryStatus?: string;
  /** timeline ระดับใบ — ช่วงเอกสารคลังอ้างถึงรอบที่ถึงกำหนดถัดไป */
  timeline: SalesTrackingTimelineStep[];
  roundCount: number;
  rounds: SalesTrackingRoundTimeline[];
};

export type SalesTrackingQueryParams = {
  keyword?: string;
  customerId?: string;
  salesOrderStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  itemIds?: string[];
  page?: number;
  pageSize?: number;
};
