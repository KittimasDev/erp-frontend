export type ProcurementStockBalanceRow = {
  itemCode: string;
  itemName: string;
  warehouseName: string;
  locationName: string;
  unitCode: string;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable: string;
};

export type ProcurementStockMovementRow = {
  movementDate: string;
  movementType: string;
  movementTypeLabel: string;
  referenceDocNo: string;
  itemCode: string;
  itemName: string;
  warehouseName: string;
  locationName: string;
  unitCode: string;
  quantityIn: string;
  quantityOut: string;
};

export type ProcurementSalesByItemRow = {
  itemCode: string;
  itemName: string;
  unitCode: string;
  quantity: string;
  amount: string;
};

export type ProcurementReportPage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export type ProcurementReportExport<T> = {
  items: T[];
  total: number;
  truncated: boolean;
};

export type ProcurementReportEnvelope<T> = {
  message: string;
  data: T;
};

export type ProcurementReportQuery = {
  page?: number;
  limit?: number;
  q?: string;
  warehouseId?: string;
  itemId?: string;
  dateFrom?: string;
  dateTo?: string;
};
