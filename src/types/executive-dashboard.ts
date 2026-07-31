export type ExecutivePendingApprovalsBreakdown = {
  salesOrdersDraft?: number;
  purchaseOrdersAwaitingGr?: number;
  stockAdjustmentsDraft?: number;
  stockTransfersDraft?: number;
  leaveRequestsDraft?: number;
  [key: string]: number | undefined;
};

export type ExecutiveSummary = {
  totalSalesAmount: string;
  totalProcurementAmount: string;
  totalInventoryValue: string;
  pendingApprovalsCount: number;
  pendingApprovalsBreakdown: ExecutivePendingApprovalsBreakdown;
};

export type ExecutiveSummaryApiResponse = {
  statusCode: number;
  message: string;
  data: ExecutiveSummary;
};
