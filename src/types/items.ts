export type ItemRelationSummary = {
  id: string;
  code: string;
  nameTh: string;
};

export type Item = {
  id: string;
  itemCode: string;
  itemNameTh: string;
  description?: string;
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
  isFinishedGood: boolean;
  minimumStockQty: string;
  /** ราคาขายต่อหน่วย (ก่อน VAT) — null/undefined = ยังไม่กำหนด */
  sellingPrice?: string;
  requiresLotControl: boolean;
  requiresQc: boolean;
  requiresExpiryDate: boolean;
  defaultShelfLifeDays?: number;
  allowNegativeStock: boolean;
  isQcRequired: boolean;
  isActive: boolean;
  /** มีเอกสารหรือความเคลื่อนไหวแล้ว — ห้ามแก้รหัส หน่วยนับ คุม Lot วันหมดอายุ */
  hasTransactions: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ItemQueryParams = {
  code?: string;
  name?: string;
  description?: string;
  itemCategoryId?: string;
  itemCategoryCode?: string;
  unitId?: string;
  isActive?: boolean;
  isPurchaseItem?: boolean;
  isStockItem?: boolean;
  isSalesItem?: boolean;
  isFinishedGood?: boolean;
};

export type CreateItemRequest = {
  code: string;
  name: string;
  description?: string;
  itemCategoryId: string;
  unitId: string;
  warehouseGroup: string;
  isPurchaseItem?: boolean;
  isStockItem?: boolean;
  isIssueItem?: boolean;
  isSalesItem?: boolean;
  isFinishedGood?: boolean;
  minimumStockQty?: number;
  /** บังคับส่งเมื่อ isSalesItem = true — backend ปฏิเสธถ้าไม่มี */
  sellingPrice?: number;
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
