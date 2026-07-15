export type Warehouse = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType?: string;
  warehouseGroup?: string;
  description?: string;
  allowNegativeStock: boolean;
  isQcRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseQueryParams = {
  code?: string;
  name?: string;
  warehouseGroup?: string;
  description?: string;
  isActive?: boolean;
  allowNegativeStock?: boolean;
  isQcRequired?: boolean;
};

export type CreateWarehouseRequest = {
  code: string;
  name: string;
  warehouseGroup?: string;
  description?: string;
  allowNegativeStock?: boolean;
  isQcRequired?: boolean;
  isActive?: boolean;
};

export type UpdateWarehouseRequest = Partial<CreateWarehouseRequest>;

export type WarehouseApiResponse = {
  message: string;
  data: Warehouse;
};

export type WarehouseListApiResponse = {
  message: string;
  data: Warehouse[];
};
