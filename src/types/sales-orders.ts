import { getStoredLanguage, type Language } from "@/lib/i18n/language";
import { translate } from "@/lib/i18n/translate";

const STATUS_EN_OVERRIDE: Record<string, string> = {
  /* คำที่ในบริบทใบสั่งขายความหมายต่างจากพจนานุกรมกลาง (เช่น "ยกเลิก" = Cancelled ไม่ใช่ปุ่ม Cancel, "ใบจ่ายสินค้า" เอกพจน์) */
  "ยกเลิก": "Cancelled",
  "ยืนยัน": "Confirmed",
  "จ่ายแล้ว": "Issued",
  "ยกเลิกใบสั่งขาย": "Cancel sales order",
  "ยืนยันใบสั่งขาย": "Confirm sales order",
  "เลื่อนกำหนดส่ง": "Reschedule delivery",
  "ข้อมูลลูกค้า": "Customer details",
  "ใบเสนอราคา": "Quotation",
  "ใบจ่ายสินค้า": "Picking list",
  "ใบส่งสินค้า": "Delivery order",
  "ใบขอผลิต (จากใบสั่งขาย)": "Production request (from sales order)",
  "จ่ายบางส่วน": "Partially issued",
  "รอยืนยัน": "Awaiting confirmation",
  "ปฏิเสธ": "Rejected",
  "รอดำเนินการ": "Pending",
  "ส่งแล้ว": "Delivered",
  /* ชื่อขั้นตอนบนแถบความคืบหน้า (SALES_ORDER_FLOW_STEPS.shortLabel) */
  "จ่าย": "Issue",
  "ส่ง": "Deliver",
  /* ข้อความขั้นตอน/สิ่งที่ต้องทำถัดไปที่ backend ส่งมา (sales-tracking.service) */
  "ร่างใบสั่งขาย": "Draft sales order",
  "จองสต๊อกให้ครบแล้วยืนยันใบสั่งขาย": "Reserve all stock, then confirm the sales order",
};

/** แปลป้ายสถานะ/ขั้นตอนของใบสั่งขายตามภาษา — เรียกตอนเรนเดอร์ในคอมโพเนนต์ที่ใช้ useT()/useLanguage() อยู่แล้ว */
export function tSoStatus(label: string, lang?: Language): string {
  const current = lang ?? getStoredLanguage();
  if (current === "en" && STATUS_EN_OVERRIDE[label]) {
    return STATUS_EN_OVERRIDE[label];
  }
  return translate(current, label);
}

export type SalesOrderStatus =
  | "DRAFT"
  | "AWAITING_CONFIRM"
  | "CONFIRMED"
  | "STOCK_CHECKED"
  | "PICKING"
  | "PACKED"
  | "DELIVERED"
  | "PARTIALLY_ISSUED"
  | "COMPLETED"
  | "CANCELLED";

export function isPreConfirmSalesOrderStatus(status?: string): boolean {
  return status === "DRAFT" || status === "AWAITING_CONFIRM";
}

export const SALES_ORDER_STATUS_LABEL: Record<SalesOrderStatus, string> = {
  DRAFT: "แบบร่างเอกสาร",
  AWAITING_CONFIRM: "รอยืนยันใบสั่งขาย",
  CONFIRMED: "ยืนยันแล้ว",
  STOCK_CHECKED: "ตรวจสต๊อกแล้ว",
  PICKING: "จ่ายสินค้าแล้ว",
  PACKED: "บรรจุแล้ว",
  DELIVERED: "ส่งแล้ว",
  PARTIALLY_ISSUED: "จ่ายสินค้าบางส่วน",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export type SalesOrderCustomerSummary = {
  id: string;
  customerCode: string;
  nameTh: string;
  taxId?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  creditLimit?: string;
};

export type SalesOrderPaymentTermSummary = {
  id: string;
  code: string;
  name: string;
  creditDays?: number;
};

export type SalesOrderTaxRateSummary = {
  id: string;
  code: string;
  name: string;
  rate: number;
};

export type SalesOrderPaymentMethod = "CASH" | "TRANSFER" | "CHEQUE";

export const SALES_ORDER_PAYMENT_METHOD_LABEL: Record<
  SalesOrderPaymentMethod,
  string
> = {
  CASH: "เงินสด",
  TRANSFER: "โอนเงิน",
  CHEQUE: "เช็ค",
};

export type SalesOrderUserSummary = {
  id: string;
  username: string;
  displayName: string;
};

export type SalesOrderItem = {
  id: string;
  itemId: string;
  itemCode?: string;
  itemNameTh?: string;
  description?: string;
  quantity: string;
  unitId: string;
  unitCode?: string;
  unitPrice: string;
  discountAmount: string;
  amount: string;
  reservedQuantity: string;
  issuedQuantity: string;
  deliveredQuantity: string;
  /** ตีกลับแล้วปิดการส่ง (ไม่นำเข้าคลัง + ไม่ส่งใหม่) — ไม่นับเป็นค้างส่ง */
  closedQuantity?: string;
  sortOrder: number;
};

export type SalesOrder = {
  id: string;
  soNo: string;
  soDate: string;
  salesQuotationId?: string;
  salesQuotationNo?: string;
  customerId: string;
  customer?: SalesOrderCustomerSummary;
  paymentTermId?: string;
  paymentTerm?: SalesOrderPaymentTermSummary;
  taxRateId?: string;
  taxRate?: SalesOrderTaxRateSummary;
  vatMode?: string;
  withholdingTaxType?: string;
  withholdingTaxPercent?: string;
  withholdingTaxAmount?: string;
  contactName?: string;
  /** ที่อยู่ที่คัดลอกจากใบเสนอราคา (แสดงอย่างเดียว) */
  customerAddress?: string;
  paymentMethod?: string;
  paymentDueDate?: string;
  status: SalesOrderStatus | string;
  requestedDeliveryDate?: string;
  deliveryStatus?: string;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  remark?: string;
  customerPoNo?: string;
  customerPoDate?: string;
  revisedAt?: string;
  /** เลขฉบับเอกสาร — ร่าง = 0, ยืนยัน = 1, แก้รอบจัดส่งเพิ่มทีละ 1 */
  revisionNo: number;
  /**
   * เลขรุ่นกันบันทึกทับกัน — ส่งกลับไปทาง If-Match ตอนแก้เอกสาร
   * ผู้ใช้ไม่เห็นตัวเลขนี้ ไม่ใช่เลขฉบับ (ดู revisionNo)
   */
  editVersion: number;
  createdById?: string;
  createdBy?: SalesOrderUserSummary;
  confirmedById?: string;
  confirmedBy?: SalesOrderUserSummary;
  confirmedAt?: string;
  items: SalesOrderItem[];
  createdAt: string;
  updatedAt: string;
};

export type SalesOrderQueryParams = {
  soNo?: string;
  customerId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  itemIds?: string[];
};

export type CreateSalesOrderFromQuotationBody = {
  remark?: string;
};

export type UpdateSalesOrderCustomerPoBody = {
  customerPoNo: string;
};

export type UpdateSalesOrderHeaderBody = {
  contactName?: string;
  paymentMethod?: SalesOrderPaymentMethod;
  paymentDueDate?: string;
  customerPoDate?: string;
  remark?: string;
  vatMode?: string;
  taxRateId?: string;
};

/** แก้จำนวน / ส่วนลด รายบรรทัด — ราคาต่อหน่วยล็อกตาม QT */
/** ไม่ส่ง `id` = บรรทัดใหม่ */
export type UpdateSalesOrderItemLineBody = {
  id?: string;
  itemId: string;
  unitId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  description?: string;
  sortOrder?: number;
};

/** `items` คือชุดที่ต้องการทั้งหมด — บรรทัดเดิมที่ไม่ส่งกลับมาจะถูกลบ */
export type UpdateSalesOrderItemsBody = {
  items: UpdateSalesOrderItemLineBody[];
  discountAmount?: number;
};

export type StockVerificationAvailableLot = {
  lotId: string;
  lotNo?: string;
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  locationId: string;
  locationCode?: string;
  availableQty: string;
};

export type StockVerificationAvailableLocation = {
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
  locationId: string;
  locationCode?: string;
  availableQty: string;
};

export type SalesOrderStockVerificationLine = {
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  orderedQty: string;
  reservedQty?: string;
  issuedQty?: string;
  availableQty: string;
  shortageQty: string;
  pendingProductionQty?: string;
  unplannedShortageQty?: string;
  isAvailable: boolean;
  availableLots?: StockVerificationAvailableLot[];
  availableLocations?: StockVerificationAvailableLocation[];
};

export type SalesOrderReservationLine = {
  salesOrderItemId: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  orderedQty: string;
  reservedQty: string;
  availableQty: string;
  shortageQty: string;
  /** มีใบขอผลิตคุมไว้แล้วแต่ยังผลิตไม่เสร็จ */
  pendingProductionQty: string;
  /** ยังต้องหาของเพิ่มจริง ๆ = สั่ง − จองแล้ว − รอผลิต */
  unplannedShortageQty: string;
  canReserve: boolean;
  canRelease: boolean;
  isFullyReserved: boolean;
};

export type SalesOrderReservationStatus = {
  salesOrderId: string;
  soNo?: string;
  status: string;
  isAllFullyReserved: boolean;
  hasShortage: boolean;
  /** ยังขาดของจริง ๆ หลังหักที่สั่งผลิตไว้แล้ว */
  hasUnplannedShortage: boolean;
  lines: SalesOrderReservationLine[];
};

export type SalesOrderReservationStatusApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrderReservationStatus;
};

export type SalesOrderStockVerification = {
  salesOrderId: string;
  soNo?: string;
  status: string;
  isAllAvailable: boolean;
  lines: SalesOrderStockVerificationLine[];
};

export type SalesOrderStockVerificationApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrderStockVerification;
};

export type StockVerificationPendingOrder = {
  id: string;
  soNo: string;
  soDate: string;
  requestedDeliveryDate?: string;
  customerId: string;
  customerCode?: string;
  customerName?: string;
  itemCount: number;
  status: string;
};

export type StockVerificationPendingListApiResponse = {
  statusCode?: number;
  message: string;
  data: StockVerificationPendingOrder[];
};

export type SalesOrderAvailableWarehouse = {
  warehouseId: string;
  warehouseCode?: string;
  warehouseName?: string;
};

export type SalesOrderAvailableWarehouseListApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrderAvailableWarehouse[];
};

export type SalesOrderApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrder;
};

export type SalesOrderListApiResponse = {
  statusCode?: number;
  message: string;
  data: SalesOrder[];
};

export type SalesOrderPdfSnapshotChangeSource =
  | "UPDATE_ITEMS"
  | "UPDATE_CUSTOMER_PO"
  | "UPDATE_HEADER"
  | "RESCHEDULE"
  | "CANCEL_ROUND"
  | "CANCEL"
  | "DELIVERY_RETURN";

export type SalesOrderPdfSnapshotLine = {
  no: number;
  itemCode: string;
  itemName: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  amount: number;
};

export type SalesOrderPdfSnapshotPayload = {
  soNo: string;
  soDate: string;
  customerName: string;
  customerCode: string;
  customerTaxId?: string;
  customerAddress?: string;
  customerPhone?: string;
  contactName?: string;
  customerPoNo: string;
  customerPoDate?: string;
  quotationNo: string;
  paymentMethod?: string;
  paymentDueDate?: string;
  paymentTerm?: string;
  requestedDeliveryDate: string;
  remark: string;
  taxRatePercent?: number;
  revisedAt?: string;
  /** เลขฉบับ ณ ตอนที่เก็บ snapshot — คือเลขก่อนถูกดันขึ้น */
  revisionNo?: number;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  items: SalesOrderPdfSnapshotLine[];
  rounds?: Array<{
    roundNo: number;
    deliveryDate: string;
    items: SalesOrderPdfSnapshotLine[];
  }>;
  preparedBy?: {
    id?: string;
    name?: string;
    preparedBySignatureDataUrl?: string;
  };
};

export type SalesOrderPdfSnapshot = {
  id: string;
  versionNo: number;
  changeSource: SalesOrderPdfSnapshotChangeSource | string;
  createdAt: string;
  createdByName?: string;
  payload: SalesOrderPdfSnapshotPayload;
};

export type SalesOrderPdfSnapshotListApiResponse = {
  statusCode?: number;
  message: string;
  data: {
    items: SalesOrderPdfSnapshot[];
  };
};
