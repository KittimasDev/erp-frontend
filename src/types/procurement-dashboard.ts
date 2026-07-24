export type ProcurementTrackingRow = {
  id: string;
  poNo: string;
  poDate: string;
  prNo?: string;
  creditorName: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  grCount: number;
};

export type ProcurementTrackingListData = {
  items: ProcurementTrackingRow[];
  total: number;
  page: number;
  limit: number;
};

export type ProcurementTrackingQueryParams = {
  poNo?: string;
  prNo?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ProcurementStatusBreakdown = {
  status: string;
  count: number;
  amount: string;
};

export type ProcurementMonthlyTrend = {
  month: string;
  poCount: number;
  totalAmount: string;
};

export type ProcurementSummary = {
  totalPOs: number;
  totalAmount: string;
  awaitingGrCount: number;
  awaitingPaymentCount: number;
  statusBreakdown: ProcurementStatusBreakdown[];
  monthlyTrend: ProcurementMonthlyTrend[];
};

export type ProcurementSummaryQueryParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type ProcurementTrackingListApiResponse = {
  statusCode: number;
  message: string;
  data: ProcurementTrackingListData;
};

export type ProcurementSummaryApiResponse = {
  statusCode: number;
  message: string;
  data: ProcurementSummary;
};
