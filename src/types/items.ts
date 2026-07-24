export type ItemRelationSummary = {
  id: string;
  code: string;
  nameTh: string;
};

export type Item = {
  id: string;
  itemCode: string;
  itemNameTh: string;
  itemCategoryId: string;
  itemCategory?: ItemRelationSummary;
  unitId: string;
  unit?: ItemRelationSummary;
  itemType?: string;
  warehouseGroup?: string;
  isPurchaseItem: boolean;
  isStockItem: boolean;
  isIssueItem: boolean;
  isSalesItem: boolean;
  minimumStockQty: string;
  requiresLotControl: boolean;
  requiresQc: boolean;
  requiresExpiryDate: boolean;
  defaultShelfLifeDays?: number;
  allowNegativeStock: boolean;
  isQcRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ItemQueryParams = {
  code?: string;
  name?: string;
  itemCategoryId?: string;
  unitId?: string;
  itemType?: string;
  isActive?: boolean;
  isPurchaseItem?: boolean;
  isStockItem?: boolean;
  isSalesItem?: boolean;
};

export type CreateItemRequest = {
  code: string;
  name: string;
  itemCategoryId: string;
  unitId: string;
  itemType?: string;
  warehouseGroup?: string;
  isPurchaseItem?: boolean;
  isStockItem?: boolean;
  isIssueItem?: boolean;
  isSalesItem?: boolean;
  minimumStockQty?: number;
  requiresLotControl?: boolean;
  requiresQc?: boolean;
  requiresExpiryDate?: boolean;
  defaultShelfLifeDays?: number;
  allowNegativeStock?: boolean;
  isQcRequired?: boolean;
  isActive?: boolean;
};

export type UpdateItemRequest = Partial<CreateItemRequest>;

export type ItemApiResponse = {
  message: string;
  data: Item;
};

export type ItemListApiResponse = {
  message: string;
  data: Item[];
};
