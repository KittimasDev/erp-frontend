export type StockAdjustmentTypeMaster = {
  id: string;
  code: string;
  nameTh: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type StockAdjustmentTypeQueryParams = {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateStockAdjustmentTypeRequest = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateStockAdjustmentTypeRequest =
  Partial<CreateStockAdjustmentTypeRequest>;

export type StockAdjustmentTypeApiResponse = {
  message: string;
  data: StockAdjustmentTypeMaster;
};

export type StockAdjustmentTypeListApiResponse = {
  message: string;
  data: StockAdjustmentTypeMaster[];
};
