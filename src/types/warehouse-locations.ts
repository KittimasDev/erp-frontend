export type WarehouseLocation = {
  id: string;
  warehouseId: string;
  locationCode: string;
  locationName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseLocationQueryParams = {
  warehouseId?: string;
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
};

export type CreateWarehouseLocationRequest = {
  warehouseId: string;
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export type UpdateWarehouseLocationRequest =
  Partial<CreateWarehouseLocationRequest>;

export type WarehouseLocationApiResponse = {
  message: string;
  data: WarehouseLocation;
};

export type WarehouseLocationListApiResponse = {
  message: string;
  data: WarehouseLocation[];
};
