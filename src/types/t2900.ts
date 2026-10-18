export type T2900RecordStatus = "ACTIVE" | "UPDATED" | "CANCELLED";

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
