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
  /** OIL, RCB, STEEL, SYNGAS, OTHER — ว่าง = Dashboard เดาจากชื่อสินค้า */
  outputKind?: string | null;
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
  /** ต้องมีเลขอ้างอิง/ไฟล์ COA ของ Lot ก่อนส่งมอบลูกค้า */
  requiresCoa?: boolean;
  /** ชื่อไฟล์รูปสินค้า — null/undefined = ยังไม่มีรูป (ดูรูปที่ GET /api/master-data/items/:id/image) */
  imageFileName?: string | null;
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
  /** true = เฉพาะสินค้าที่ยอดคงเหลือรวมทุกคลังต่ำกว่าสต๊อกขั้นต่ำ */
  lowStock?: boolean;
};

/** OUT = หมดสต๊อก · LOW = ต่ำกว่าขั้นต่ำ · OK = ปกติ · NONE = ไม่ได้ตั้งขั้นต่ำ */
export type ItemStockLevel = "OUT" | "LOW" | "OK" | "NONE";

export type ItemStockSummaryRow = {
  itemId: string;
  /** ยอดคงเหลือรวมทุกคลัง */
  totalOnHand: number;
  minimumStockQty: number;
  shortageQty: number;
  level: ItemStockLevel;
};

export type ItemStockSummary = {
  items: ItemStockSummaryRow[];
  /** นับทั้งระบบ (สินค้าใช้งานอยู่ที่ตั้งขั้นต่ำไว้) */
  summary: { lowCount: number; outCount: number };
};

export type CreateItemRequest = {
  code: string;
  name: string;
  description?: string;
  itemCategoryId: string;
  unitId: string;
  itemType?: string;
  /** null = ล้างค่า ให้ Dashboard กลับไปเดาจากชื่อ */
  outputKind?: string | null;
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
  requiresCoa?: boolean;
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
