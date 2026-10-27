export type T2900RecordStatus = "ACTIVE" | "UPDATED" | "CANCELLED";

export type T2900CameraPhotoFlag = {
  key: string;
  label: string;
  present: boolean;
};

export type T2900OutboundTicketSummary = {
  TckNo: string;
  TruckNo: string;
  SeqNo: string;
  CustID: string;
  CustomerName?: string;
  ProdID: string;
  ProdName?: string;
  LoctID?: string;
  DateIn: string;
  TimeIn: string;
  GrossWt: number;
  DateOut: string;
  TimeOut: string;
  TruckWt: number;
  NetWt: number;
  ProdWt: number;
  Flag1?: number;
  TckMode: number;
  TckSts: number;
  RecDtTm: string;
  recordStatus: T2900RecordStatus | string;
  lastUpdatedAt: string;
  /** จำนวนรูปกล้องใน payload (ไม่ใช่เนื้อหารูป) */
  cameraPhotoCount?: number;
  cameraPhotos?: T2900CameraPhotoFlag[];
};

export type T2900ErpOutboundTicket = T2900OutboundTicketSummary & {
  erpTicketId?: string;
  erpReceiptId?: string;
  alreadyImported: boolean;
  canImport: boolean;
  erpReceiptStatus?: string;
  erpPaymentStatus?: string;
  erpStockPostingStatus?: string;
  erpActionLabel?: string;
  erpActionHref?: string;
};

export type T2900ErpOutboundListData = {
  page: number;
  limit: number;
  total: number;
  items: T2900ErpOutboundTicket[];
};

export type T2900ErpOutboundListApiResponse = {
  statusCode?: number;
  message: string;
  data: T2900ErpOutboundListData;
};

export type T2900OutboundTicketsQuery = {
  dateFrom: string;
  dateTo: string;
  updatedAfter?: string;
  status?: "COMPLETED" | "CANCELLED" | "ALL";
  page?: number;
  limit?: number;
};

export type ImportFromT2900Request = {
  tckNo: string;
};

export type T2900PriceSource = "T2900" | "PRICE_RULE" | "NONE";

export type T2900Pricing = {
  source: T2900PriceSource;
  pricePerKg: number | null;
  estimatedAmount: number | null;
  weightKg: number;
  ruleCode: string | null;
  effectiveDate: string | null;
  classification: { id: string; code: string; name: string } | null;
  message: string | null;
};

/** ข้อมูลบัตรทั้งใบจากเครื่องชั่ง (ไม่รวมเนื้อหารูป) — ฟิลด์เกินจากนี้มาอยู่ใน index signature */
export type T2900TicketData = T2900OutboundTicketSummary &
  Record<string, unknown>;

export type T2900ErpTicketDetail = {
  ticket: T2900TicketData;
  /** 1 = คัดแยกและชั่ง (มีแต่ชั่งเข้า) · 2 = ออกใบจ่ายเงิน (มีเข้าและออกครบ) */
  step: 1 | 2;
  cancelled: boolean;
  canConfirm: boolean;
  erpTicketId?: string;
  erpReceiptId?: string;
  erpReceiptStatus?: string;
  erpPaymentStatus?: string;
  erpStockPostingStatus?: string;
  erpActionLabel?: string;
  erpActionHref?: string;
  pricing: T2900Pricing;
  cameraPhotos: T2900CameraPhotoFlag[];
};

export type T2900ErpTicketDetailApiResponse = {
  statusCode?: number;
  message: string;
  data: T2900ErpTicketDetail;
};

export type ConfirmFromT2900Request = {
  tckNo: string;
  pricePerKg?: number;
};
