export type Warehouse = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  /** รหัสประเภทคลัง อ้าง warehouse_types.code */
  warehouseType?: string;
  warehouseGroup?: string;
  description?: string;
  allowNegativeStock: boolean;
  isQcRequired: boolean;
  isDefaultReturnInspection?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseQueryParams = {
  code?: string;
  name?: string;
  warehouseGroup?: string;
  /** คลังที่ประเภทผูกกับเมนูนี้ (warehouse_types.menu_scope) */
  menuScope?: string;
  description?: string;
  isActive?: boolean;
  allowNegativeStock?: boolean;
  isQcRequired?: boolean;
};

export type CreateWarehouseRequest = {
  code: string;
  name: string;
  /** รหัสประเภทคลัง — ชื่อ field คงไว้ตาม API เดิม */
  warehouseGroup?: string;
  description?: string;
  allowNegativeStock?: boolean;
  isQcRequired?: boolean;
  isDefaultReturnInspection?: boolean;
  isActive?: boolean;
};

export type UpdateWarehouseRequest = Partial<CreateWarehouseRequest>;

export type WarehouseApiResponse = {
  statusCode: number;
  message: string;
  data: Warehouse;
};

export type WarehouseListApiResponse = {
  statusCode: number;
  message: string;
  data: Warehouse[];
};
