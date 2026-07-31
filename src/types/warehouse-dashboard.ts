export type WarehouseMonthlyMovementTrend = {
  month: string;
  quantityIn: string;
  quantityOut: string;
};

export type WarehouseSummary = {
  totalStockValue: string;
  lowStockCount: number;
  pendingStockAdjustmentCount: number;
  pendingStockTransferCount: number;
  pendingStockCountCount: number;
  monthlyMovementTrend: WarehouseMonthlyMovementTrend[];
};

export type WarehouseSummaryApiResponse = {
  statusCode: number;
  message: string;
  data: WarehouseSummary;
};
