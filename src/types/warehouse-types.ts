export type WarehouseMenuScope = "RAW_MATERIAL" | "FINISHED_GOODS";

export type WarehouseTypeMaster = {
  id: string;
  code: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  isSellable: boolean;
  receiveAsOnHold: boolean;
  isReturnInspection: boolean;
  isReturnGoodTarget: boolean;
  isReturnRejectTarget: boolean;
  menuScope?: WarehouseMenuScope | string | null;
  warehouseCount: number;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseTypeQueryParams = {
  q?: string;
  isActive?: boolean;
};

export type CreateWarehouseTypeRequest = {
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  isSellable?: boolean;
  receiveAsOnHold?: boolean;
  isReturnInspection?: boolean;
  isReturnGoodTarget?: boolean;
  isReturnRejectTarget?: boolean;
  menuScope?: WarehouseMenuScope | null;
};

export type UpdateWarehouseTypeRequest = Partial<CreateWarehouseTypeRequest>;

export type WarehouseTypeApiResponse = {
  message: string;
  data: WarehouseTypeMaster;
};

export type WarehouseTypeListApiResponse = {
  message: string;
  data: WarehouseTypeMaster[];
};
